import {
  API_URL,
  ApiError,
  api,
  request,
  setAuthHandlers,
  toQueryString,
} from "@/services/api";
import {
  clearTokens,
  getTokens,
  type StoredTokens,
  saveTokens,
} from "@/services/token-storage";

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

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

const oldTokens: StoredTokens = {
  accessToken: "old-access",
  refreshToken: "old-refresh",
  exp: 1,
};

const newTokenResponse = {
  access_token: "new-access",
  refresh_token: "new-refresh",
  exp: 9999999999,
};

function authHeaderOf(call: number): string | undefined {
  return mockFetch.mock.calls[call][1].headers.Authorization;
}

function urlOf(call: number): string {
  return mockFetch.mock.calls[call][0];
}

const handlers = {
  onTokensRefreshed: jest.fn(),
  onAuthFailure: jest.fn(),
};

beforeEach(async () => {
  jest.clearAllMocks();
  await clearTokens();
  setAuthHandlers(handlers);
});

afterEach(() => {
  setAuthHandlers(null);
});

describe("toQueryString", () => {
  it("should skip undefined values and encode the rest", () => {
    expect(toQueryString({ a: "x y", b: undefined, c: 2 })).toBe(
      "?a=x%20y&c=2",
    );
  });

  it("should return an empty string without params", () => {
    expect(toQueryString({ a: undefined })).toBe("");
    expect(toQueryString()).toBe("");
  });
});

describe("request: Bearer", () => {
  it("should attach the stored access token", async () => {
    await saveTokens(oldTokens);
    mockFetch.mockResolvedValueOnce(makeResponse([]));

    await request("/habits");

    expect(urlOf(0)).toBe(`${API_URL}/habits`);
    expect(authHeaderOf(0)).toBe("Bearer old-access");
  });

  it("should not attach the token on public routes", async () => {
    await saveTokens(oldTokens);
    mockFetch.mockResolvedValueOnce(makeResponse(newTokenResponse));

    await api.login({ login: "ana", password: "123" });

    expect(authHeaderOf(0)).toBeUndefined();
    // `auth` é opção nossa e não vai para o fetch.
    expect(mockFetch.mock.calls[0][1]).not.toHaveProperty("auth");
  });

  it("should keep a header sent by the caller", async () => {
    await saveTokens(oldTokens);
    mockFetch.mockResolvedValueOnce(makeResponse({ id: "u1" }));

    await api.getMe("manual-token");

    expect(authHeaderOf(0)).toBe("Bearer manual-token");
  });

  it("should send no header when there are no tokens", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse([]));

    await request("/habits");

    expect(authHeaderOf(0)).toBeUndefined();
  });
});

describe("request: refresh on 401", () => {
  it("should refresh once, save the tokens and retry the request", async () => {
    await saveTokens(oldTokens);
    mockFetch
      .mockResolvedValueOnce(makeResponse({ detail: "expired" }, 401))
      .mockResolvedValueOnce(makeResponse(newTokenResponse))
      .mockResolvedValueOnce(makeResponse([{ id: "h1" }]));

    const result = await request("/habits");

    expect(result).toEqual([{ id: "h1" }]);
    expect(urlOf(1)).toBe(`${API_URL}/auth/refresh`);
    expect(JSON.parse(mockFetch.mock.calls[1][1].body)).toEqual({
      refresh_token: "old-refresh",
    });
    expect(authHeaderOf(2)).toBe("Bearer new-access");
    expect(await getTokens()).toEqual({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      exp: 9999999999,
    });
    expect(handlers.onTokensRefreshed).toHaveBeenCalledWith(
      expect.objectContaining({ refreshToken: "new-refresh" }),
    );
  });

  it("should share a single refresh between requests that fail together", async () => {
    await saveTokens(oldTokens);

    mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith("/auth/refresh")) {
        return makeResponse(newTokenResponse);
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === "Bearer new-access"
        ? makeResponse({ ok: url })
        : makeResponse({ detail: "expired" }, 401);
    });

    const results = await Promise.all([
      request("/habits"),
      request("/check-ins/categories"),
      request("/habits/h1"),
    ]);

    const refreshCalls = mockFetch.mock.calls.filter(([url]) =>
      String(url).endsWith("/auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);
    expect(results).toEqual([
      { ok: `${API_URL}/habits` },
      { ok: `${API_URL}/check-ins/categories` },
      { ok: `${API_URL}/habits/h1` },
    ]);
  });

  it("should reuse tokens refreshed by another request without refreshing again", async () => {
    await saveTokens(oldTokens);
    mockFetch
      // A requisição saiu com o token antigo e, enquanto estava no ar, outro
      // refresh já salvou um par novo.
      .mockImplementationOnce(async () => {
        await saveTokens({ ...oldTokens, accessToken: "already-new" });
        return makeResponse({ detail: "expired" }, 401);
      })
      .mockResolvedValueOnce(makeResponse({ ok: true }));

    expect(await request("/habits")).toEqual({ ok: true });
    expect(authHeaderOf(1)).toBe("Bearer already-new");
    expect(
      mockFetch.mock.calls.some(([url]) =>
        String(url).endsWith("/auth/refresh"),
      ),
    ).toBe(false);
  });

  it("should clear the tokens and notify when the refresh is rejected", async () => {
    await saveTokens(oldTokens);
    mockFetch
      .mockResolvedValueOnce(makeResponse({ detail: "expired" }, 401))
      .mockResolvedValueOnce(makeResponse({ detail: "Token inválido." }, 401));

    await expect(request("/habits")).rejects.toMatchObject({ status: 401 });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(await getTokens()).toBeNull();
    expect(handlers.onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it("should keep the session when the refresh fails because of the network", async () => {
    await saveTokens(oldTokens);
    mockFetch
      .mockResolvedValueOnce(makeResponse({ detail: "expired" }, 401))
      .mockRejectedValueOnce(new TypeError("Network request failed"));

    await expect(request("/habits")).rejects.toThrow(TypeError);

    expect(await getTokens()).toEqual(oldTokens);
    expect(handlers.onAuthFailure).not.toHaveBeenCalled();
  });

  it("should not refresh a 401 from a public route", async () => {
    await saveTokens(oldTokens);
    mockFetch.mockResolvedValueOnce(
      makeResponse({ detail: "Credenciais inválidas." }, 401),
    );

    await expect(
      api.login({ login: "ana", password: "errada" }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(await getTokens()).toEqual(oldTokens);
  });

  it("should not refresh a 401 when the caller sent the header", async () => {
    await saveTokens(oldTokens);
    mockFetch.mockResolvedValueOnce(makeResponse({ detail: "expired" }, 401));

    await expect(api.getMe("manual-token")).rejects.toMatchObject({
      status: 401,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
