import { act, renderHook } from "@testing-library/react-native";
import { router } from "expo-router";
import { useGroupFeed } from "@/hooks/useGroupFeed";
import { ApiError, request } from "@/services/api";
import type { FeedItem, FeedPage } from "@/services/types/groups";

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), back: jest.fn(), push: jest.fn() } }));
jest.mock("@/services/api", () => ({ ...jest.requireActual("@/services/api"), request: jest.fn() }));

const mockRequest = request as jest.MockedFunction<typeof request>;
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function item(id: string, cursor = id): FeedItem {
  return { id, cursor, author: { id: "u", username: "ana" }, title: id, description: null, habits: [], created_at: "2026-11-25T10:00:00Z" };
}
function page(items: FeedItem[], next_cursor: string | null = null, has_more = false): FeedPage {
  return { items, next_cursor, has_more };
}

beforeEach(() => jest.clearAllMocks());

it("422 Cursor inválido. recarrega o feed do zero", async () => {
  let first = true;
  mockRequest.mockImplementation(async (endpoint: string) => {
    if (endpoint === "/groups/g1/check-ins?limit=20") return page([item("1", "c1")], null, false);
    if (endpoint.includes("after=") && first) { first = false; throw new ApiError("Cursor inválido.", 422, { detail: "Cursor inválido." }); }
    return page([item("1", "c1")], null, false);
  });
  const { result } = await renderHook(() => useGroupFeed("g1"));
  await act(async () => { await flush(); });
  mockRequest.mockClear();
  await act(async () => { await result.current.refreshLatest(); });
  expect(mockRequest).toHaveBeenCalledWith("/groups/g1/check-ins?limit=20");
});

it("404 para a atualização e volta para a lista de grupos", async () => {
  mockRequest.mockRejectedValue(new ApiError("Não encontrado.", 404, { detail: "x" }));
  await renderHook(() => useGroupFeed("g1"));
  await act(async () => { await flush(); });
  expect(router.replace).toHaveBeenCalledWith("/(app)/(tabs)/groups");
});

it("outros erros não destroem os itens já carregados", async () => {
  let first = true;
  mockRequest.mockImplementation(async (endpoint: string) => {
    if (endpoint === "/groups/g1/check-ins?limit=20") return page([item("1", "c1")], null, false);
    if (first) { first = false; throw new ApiError("Erro", 500, {}); }
    return page([], null, false);
  });
  const { result } = await renderHook(() => useGroupFeed("g1"));
  await act(async () => { await flush(); });
  await act(async () => { await result.current.refreshLatest(); });
  expect(result.current.items?.length).toBe(1);
  expect(result.current.error).toBeTruthy();
});
