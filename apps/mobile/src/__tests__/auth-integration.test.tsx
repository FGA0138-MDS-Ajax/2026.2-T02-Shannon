import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { SessionProvider, useSession } from "@/contexts/auth-context";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("expo-secure-store", () => {
  const store: Record<string, string> = {};
  return {
    getItemAsync: jest.fn(async (key: string) => store[key] ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete store[key];
    }),
  };
});

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function make204(): Response {
  return {
    ok: true,
    status: 204,
    json: jest.fn().mockRejectedValue(new Error("no body")),
  } as unknown as Response;
}

const fakeUser = {
  id: "u1",
  name: "Ana Silva",
  username: "ana_silva",
  email: "ana@test.com",
};

const fakeTokenResponse = {
  access_token: "acc-token-integration",
  refresh_token: "ref-token-integration",
  exp: 9999999999,
};

const fakeSignupResponse = {
  user: fakeUser,
  token: fakeTokenResponse,
};

function wrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

function getSecureStore() {
  return jest.requireMock("expo-secure-store");
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  getSecureStore().getItemAsync.mockResolvedValue(null);
});

// ─── Testes de Integração ─────────────────────────────────────────────────────

describe("Integração - Autenticação", () => {
  it("INT-01: Criação de usuário pela tela/AuthProvider pela API", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(fakeSignupResponse, 201));

    const { result } = await renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.signUp({
        name: "Ana Silva",
        username: "ana_silva",
        email: "ana@test.com",
        password: "senha123456",
      });
    });

    expect(mockFetch.mock.calls[0][0]).toContain("/auth/signup");
    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.session?.accessToken).toBe("acc-token-integration");
    expect(getSecureStore().setItemAsync).toHaveBeenCalled();
  });

  it("INT-02: Login com credenciais válidas entre telas, AuthProvider, hooks e API", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(fakeTokenResponse))
      .mockResolvedValueOnce(makeResponse(fakeUser));

    const { result } = await renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.signIn({ login: "ana_silva", password: "senha123456" });
    });

    expect(mockFetch.mock.calls[0][0]).toContain("/auth/login");
    expect(mockFetch.mock.calls[1][0]).toContain("/session/me");
    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.session?.accessToken).toBe("acc-token-integration");
    expect(getSecureStore().setItemAsync).toHaveBeenCalled();
  });

  it("INT-03: Comportamento com credenciais inválidas", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ detail: "Credenciais inválidas." }, 401),
    );

    const { result } = await renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.signIn({ login: "errado", password: "errado" });
      }),
    ).rejects.toMatchObject({ status: 401 });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(getSecureStore().setItemAsync).not.toHaveBeenCalled();
  });

  it("INT-04: Comportamento com falha na API", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network request failed"));

    const { result } = await renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.signIn({ login: "ana", password: "senha123" });
      }),
    ).rejects.toThrow("Network request failed");

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(getSecureStore().setItemAsync).not.toHaveBeenCalled();
  });

  it("INT-05: Persistência da sessão após autenticação", async () => {
    getSecureStore().getItemAsync.mockResolvedValue(
      JSON.stringify({
        accessToken: "stored-acc",
        refreshToken: "stored-ref",
        exp: 9999999999,
      }),
    );
    mockFetch.mockResolvedValueOnce(makeResponse(fakeUser));

    const { result } = await renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.session?.accessToken).toBe("stored-acc");
    expect(result.current.session?.refreshToken).toBe("stored-ref");
    expect(mockFetch).toHaveBeenCalled();
  });

  it("INT-06: Logout e remoção dos dados sensíveis armazenados", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(fakeTokenResponse))
      .mockResolvedValueOnce(makeResponse(fakeUser))
      .mockResolvedValueOnce(make204());

    const { result } = await renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.signIn({ login: "ana", password: "senha123" });
    });

    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.session).not.toBeNull();

    await act(async () => {
      await result.current.signOut();
    });

    const logoutCall = mockFetch.mock.calls[2] as [string, RequestInit];
    expect(logoutCall[0]).toContain("/auth/logout");

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(getSecureStore().deleteItemAsync).toHaveBeenCalled();
  });

  it("INT-07: Logout ignora falha da API mas remove dados sensíveis", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(fakeTokenResponse))
      .mockResolvedValueOnce(makeResponse(fakeUser))
      .mockRejectedValueOnce(new Error("Network error"));

    const { result } = await renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.signIn({ login: "ana", password: "senha123" });
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(getSecureStore().deleteItemAsync).toHaveBeenCalled();
  });

  it("INT-08: Redirecionamento e acesso conforme estado de autenticação", async () => {
    const { result } = await renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();

    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce(makeResponse(fakeTokenResponse))
      .mockResolvedValueOnce(makeResponse(fakeUser));

    await act(async () => {
      await result.current.signIn({ login: "ana_silva", password: "senha123456" });
    });

    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.session).not.toBeNull();
  });

  it("INT-09: Fluxo completo cadastro -> sessão ativa -> logout sem dados persistidos", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(fakeSignupResponse, 201))
      .mockResolvedValueOnce(make204());

    const { result } = await renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.signUp({
        name: "Ana Silva",
        username: "ana_silva",
        email: "ana@test.com",
        password: "senha123456",
      });
    });

    expect(result.current.user).toEqual(fakeUser);
    expect(getSecureStore().setItemAsync).toHaveBeenCalled();

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(getSecureStore().deleteItemAsync).toHaveBeenCalled();
  });

  it("INT-10: API e expo-secure-store mockados para garantir testes determinísticos", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(fakeTokenResponse))
      .mockResolvedValueOnce(makeResponse(fakeUser));

    const { result } = await renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.signIn({ login: "teste", password: "teste123" });
    });

    expect(jest.isMockFunction(mockFetch)).toBe(true);
    expect(jest.isMockFunction(getSecureStore().getItemAsync)).toBe(true);
    expect(jest.isMockFunction(getSecureStore().setItemAsync)).toBe(true);
    expect(jest.isMockFunction(getSecureStore().deleteItemAsync)).toBe(true);
  });
});
