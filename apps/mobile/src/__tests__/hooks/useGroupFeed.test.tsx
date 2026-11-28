import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";
import { useGroupFeed, dedupeById } from "@/hooks/useGroupFeed";
import { request } from "@/services/api";
import type { FeedItem, FeedPage } from "@/services/types/groups";

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), back: jest.fn(), push: jest.fn() } }));
jest.mock("@/services/api", () => ({ ...jest.requireActual("@/services/api"), request: jest.fn() }));

const mockRequest = request as jest.MockedFunction<typeof request>;

function item(id: string, cursor = id, created = "2026-11-25T10:00:00Z"): FeedItem {
  return { id, cursor, author: { id: "u", username: "ana" }, title: id, description: null, habits: [], created_at: created };
}

function page(items: FeedItem[], next_cursor: string | null = null, has_more = false): FeedPage {
  return { items, next_cursor, has_more };
}

const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

beforeEach(() => jest.clearAllMocks());

describe("dedupeById", () => {
  it("deduplica por id mantendo a ordem fornecida pela API", () => {
    const items = [item("a"), item("b"), item("a"), item("c"), item("b")];
    expect(dedupeById(items).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});

describe("useGroupFeed", () => {
  it("abrir a tela chama o feed sem cursor", async () => {
    mockRequest.mockResolvedValue(page([item("1", "c1")], "c1", true));
    const { result } = await renderHook(() => useGroupFeed("g1"));
    await waitFor(() => expect(result.current.items?.length).toBe(1));
    expect(mockRequest).toHaveBeenCalledWith("/groups/g1/check-ins?limit=20");
  });

  it("paginar para baixo chama before={next_cursor} até has_more=false; nunca before+after", async () => {
    mockRequest.mockImplementation(async (endpoint: string) => {
      if (endpoint === "/groups/g1/check-ins?limit=20") return page([item("1", "c1")], "c1", true);
      if (endpoint === "/groups/g1/check-ins?limit=20&before=c1") return page([item("2", "c2")], null, false);
      throw new Error(endpoint);
    });
    const { result } = await renderHook(() => useGroupFeed("g1"));
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    await act(async () => { result.current.loadMore(); await flush(); });
    await waitFor(() => expect(result.current.items?.length).toBe(2));

    expect(mockRequest).toHaveBeenCalledWith("/groups/g1/check-ins?limit=20&before=c1");
    // nenhuma chamada com before e after juntos
    for (const call of mockRequest.mock.calls) {
      const url = call[0];
      expect(url.includes("before=") && url.includes("after=")).toBe(false);
    }
    // guarda e devolve o cursor opaco exatamente como recebido
    expect(result.current.hasMore).toBe(false);
  });

  it("não perde itens; deduplica por id", async () => {
    mockRequest.mockImplementation(async (endpoint: string) => {
      if (endpoint === "/groups/g1/check-ins?limit=20") return page([item("1", "c1"), item("2", "c2")], "c2", true);
      if (endpoint.includes("before=c2")) return page([item("2", "c2"), item("3", "c3")], null, false);
      if (endpoint.includes("after=")) return page([], null, false);
      throw new Error(endpoint);
    });
    const { result } = await renderHook(() => useGroupFeed("g1"));
    await waitFor(() => expect(result.current.items?.length).toBe(2));
    await act(async () => { result.current.loadMore(); await flush(); });
    await waitFor(() => expect(result.current.items?.length).toBe(3));
    expect(result.current.items?.map((i) => i.id)).toEqual(["1", "2", "3"]);
  });

  it("cada atualização chama after={cursor do item mais novo}", async () => {
    jest.useFakeTimers();
    try {
      mockRequest.mockImplementation(async (endpoint: string) => {
        if (endpoint === "/groups/g1/check-ins?limit=20") return page([item("1", "c1")], null, false);
        if (endpoint.includes("after=c1")) return page([item("9", "c9")], null, false);
        throw new Error(endpoint);
      });
      const { result } = await renderHook(() => useGroupFeed("g1"));
      await act(async () => { await flush(); });
      expect(result.current.items?.length).toBe(1);

      await act(async () => { await jest.advanceTimersByTimeAsync(12_000); await flush(); });

      expect(mockRequest).toHaveBeenCalledWith("/groups/g1/check-ins?limit=20&after=c1");
      // deduplica + prepend novo, sem perder
      expect(result.current.items?.map((i) => i.id)).toEqual(["9", "1"]);
    } finally {
      jest.useRealTimers();
    }
  });

  it("atualização automática a cada 10-15s em primeiro plano e para ao perder foco", async () => {
    jest.useFakeTimers();
    let appStateListener: ((s: string) => void) | null = null;
    const addListenerSpy = jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation(((_type: string, cb: (s: string) => void) => {
        appStateListener = cb;
        return { remove: jest.fn() };
      }) as never);
    try {
      mockRequest.mockResolvedValue(page([item("1", "c1")], null, false));
      const { result, unmount } = await renderHook(() => useGroupFeed("g1"));
      await act(async () => { await flush(); });
      expect(result.current.items?.length).toBe(1);
      mockRequest.mockClear();

      // em primeiro plano, dispara após o intervalo
      await act(async () => { await jest.advanceTimersByTimeAsync(12_000); await flush(); });
      expect(mockRequest.mock.calls.length).toBeGreaterThan(0);
      mockRequest.mockClear();

      // perde primeiro plano -> para
      await act(async () => { appStateListener?.("background"); });
      await act(async () => { await jest.advanceTimersByTimeAsync(30_000); await flush(); });
      expect(mockRequest.mock.calls.filter((c) => String(c[0]).includes("after=")).length).toBe(0);

      unmount();
      // ao fechar a tela, para
      await act(async () => { await jest.advanceTimersByTimeAsync(30_000); await flush(); });
      expect(mockRequest.mock.calls.length).toBe(0);
    } finally {
      jest.useRealTimers();
      addListenerSpy.mockRestore();
    }
  });

  });
