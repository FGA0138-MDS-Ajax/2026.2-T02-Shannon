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
  name: "Ana",
  username: "ana",
  email: "ana@test.com",
};

const fakeTokenResponse = {
  access_token: "acc-token",
  refresh_token: "ref-token",
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

// ─── Isolamento ───────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Por padrão: storage vazio (sem sessão persistida)
  getSecureStore().getItemAsync.mockResolvedValue(null);
});

// ─── Inicialização ────────────────────────────────────────────────────────────

describe("SessionProvider — inicialização", () => {
  it("U-1: termina com user=null quando não há tokens no storage", async () => {
    const { result } = await renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it("U-2: restaura sessão quando há tokens válidos no storage e getMe tem sucesso", async () => {
    getSecureStore().getItemAsync.mockResolvedValue(
      JSON.stringify({
        accessToken: "acc-token",
        refreshToken: "ref-token",
        exp: 9999999999,
      }),
    );
    mockFetch.mockResolvedValueOnce(makeResponse(fakeUser));

    const { result } = await renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.session).toMatchObject({
      accessToken: "acc-token",
      refreshToken: "ref-token",
    });
  });

  it("U-3: tenta refresh quando o access token está expirado e o refresh tem sucesso", async () => {
    getSecureStore().getItemAsync.mockResolvedValue(
      JSON.stringify({
        accessToken: "expired-acc",
        refreshToken: "valid-ref",
        exp: 1,
      }),
    );

    // 1ª chamada: getMe falha (access expirado)
    mockFetch.mockResolvedValueOnce(makeResponse({ detail: "Unauthorized" }, 401));
    // 2ª chamada: refresh retorna novos tokens
    mockFetch.mockResolvedValueOnce(makeResponse(fakeTokenResponse));
    // 3ª chamada: getMe com novo access token
    mockFetch.mockResolvedValueOnce(makeResponse(fakeUser));

    const { result } = await renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.session?.accessToken).toBe("acc-token");
  });

  it("U-4: limpa sessão quando tanto o access quanto o refresh token são inválidos", async () => {
    getSecureStore().getItemAsync.mockResolvedValue(
      JSON.stringify({
        accessToken: "bad-acc",
        refreshToken: "bad-ref",
        exp: 1,
      }),
    );

    mockFetch.mockResolvedValueOnce(makeResponse({ detail: "Unauthorized" }, 401));
    mockFetch.mockResolvedValueOnce(makeResponse({ detail: "Unauthorized" }, 401));

    const { result } = await renderHook(() => useSession(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(getSecureStore().deleteItemAsync).toHaveBeenCalled();
  });
});

// ─── signIn ───────────────────────────────────────────────────────────────────

describe("SessionProvider — signIn", () => {
  it("U-5: signIn com sucesso atualiza user e session e persiste tokens", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(fakeTokenResponse))
      .mockResolvedValueOnce(makeResponse(fakeUser));

    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signIn({ login: "ana", password: "senha123" });
    });

    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.session?.accessToken).toBe("acc-token");
    expect(getSecureStore().setItemAsync).toHaveBeenCalled();
  });

  it("U-6: signIn com credenciais inválidas lança erro e não altera o state", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ detail: "Credenciais inválidas." }, 401),
    );

    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => {
        await result.current.signIn({ login: "errado", password: "errado" });
      }),
    ).rejects.toMatchObject({ status: 401 });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });
});

// ─── signUp ───────────────────────────────────────────────────────────────────

describe("SessionProvider — signUp", () => {
  it("U-7: signUp com sucesso persiste tokens e popula user", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(fakeSignupResponse, 201));

    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signUp({
        name: "Ana",
        username: "ana",
        email: "ana@test.com",
        password: "senha123",
      });
    });

    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.session?.accessToken).toBe("acc-token");
    expect(getSecureStore().setItemAsync).toHaveBeenCalled();
  });

  it("U-8: signUp com dados duplicados lança ApiError e não altera o state", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ detail: "Username já está em uso." }, 409),
    );

    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => {
        await result.current.signUp({
          name: "Ana",
          username: "ana",
          email: "ana@test.com",
          password: "senha123",
        });
      }),
    ).rejects.toMatchObject({ status: 409 });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });
});

// ─── signOut ──────────────────────────────────────────────────────────────────

describe("SessionProvider — signOut", () => {
  it("U-9: signOut com sessão ativa chama /auth/logout e limpa state + storage", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(fakeTokenResponse)) // login
      .mockResolvedValueOnce(makeResponse(fakeUser))           // getMe
      .mockResolvedValueOnce(make204());                        // logout

    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signIn({ login: "ana", password: "senha123" });
    });
    expect(result.current.user).toEqual(fakeUser);

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();

    const logoutCall = mockFetch.mock.calls[2] as [string, RequestInit];
    expect(logoutCall[0]).toContain("/auth/logout");
    expect(JSON.parse(logoutCall[1].body as string)).toEqual({
      refresh_token: "ref-token",
    });
    expect(getSecureStore().deleteItemAsync).toHaveBeenCalled();
  });

  it("U-10: signOut ignora falha de rede e ainda limpa sessão local", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(fakeTokenResponse))
      .mockResolvedValueOnce(makeResponse(fakeUser))
      .mockRejectedValueOnce(new Error("Network error"));

    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signIn({ login: "ana", password: "senha123" });
    });

    // Não deve lançar erro mesmo com falha de rede
    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });
});

// ─── refreshSession ───────────────────────────────────────────────────────────

describe("SessionProvider — refreshSession", () => {
  it("U-11: refreshSession com token disponível renova a sessão", async () => {
    const newTokenResponse = {
      access_token: "new-acc",
      refresh_token: "new-ref",
      exp: 9999999999,
    };
    const updatedUser = { ...fakeUser, name: "Ana Atualizada" };

    mockFetch
      .mockResolvedValueOnce(makeResponse(fakeTokenResponse))  // signIn login
      .mockResolvedValueOnce(makeResponse(fakeUser))            // signIn getMe
      .mockResolvedValueOnce(makeResponse(newTokenResponse))    // refresh
      .mockResolvedValueOnce(makeResponse(updatedUser));        // getMe após refresh

    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signIn({ login: "ana", password: "senha123" });
    });

    await act(async () => {
      await result.current.refreshSession();
    });

    expect(result.current.session?.accessToken).toBe("new-acc");
    expect(result.current.user).toEqual(updatedUser);
  });

  it("U-12: refreshSession sem token não realiza nenhuma chamada de rede", async () => {
    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const callsBefore = mockFetch.mock.calls.length;

    await act(async () => {
      await result.current.refreshSession();
    });

    expect(mockFetch.mock.calls.length).toBe(callsBefore);
  });
});
