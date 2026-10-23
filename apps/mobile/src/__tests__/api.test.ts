import { ApiError, api, toStoredTokens } from "@/services/api";

// O módulo api.ts usa fetch nativo — mockamos globalmente
const mockFetch = jest.fn();
global.fetch = mockFetch;

/** Helper para criar uma Response fake com body JSON e status */
function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

/** Helper para uma Response 204 (sem body) */
function make204Response(): Response {
  return {
    ok: true,
    status: 204,
    json: jest.fn().mockRejectedValue(new Error("no body")),
  } as unknown as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── toStoredTokens ───────────────────────────────────────────────────────────

describe("toStoredTokens", () => {
  it("A-1: mapeia access_token, refresh_token e exp corretamente", () => {
    const tokenResponse = {
      access_token: "acc",
      refresh_token: "ref",
      exp: 1234567890,
    };

    const result = toStoredTokens(tokenResponse);

    expect(result).toEqual({
      accessToken: "acc",
      refreshToken: "ref",
      exp: 1234567890,
    });
  });
});

// ─── api.login ────────────────────────────────────────────────────────────────

describe("api.login", () => {
  it("A-2: faz POST /auth/login com headers e body corretos e retorna TokenResponse", async () => {
    const tokenResponse = {
      access_token: "acc",
      refresh_token: "ref",
      exp: 9999,
    };
    mockFetch.mockResolvedValueOnce(makeResponse(tokenResponse));

    const result = await api.login({ login: "user@test.com", password: "123" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/login");
    expect(options.method).toBe("POST");
    expect((options.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    expect(options.body).toBe(
      JSON.stringify({ login: "user@test.com", password: "123" }),
    );
    expect(result).toEqual(tokenResponse);
  });

  it("A-3: lança ApiError com status 401 e mensagem da API quando credenciais são inválidas", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ detail: "Credenciais inválidas." }, 401),
    );

    await expect(
      api.login({ login: "errado", password: "errado" }),
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Credenciais inválidas.",
    });
  });
});

// ─── api.signup ───────────────────────────────────────────────────────────────

describe("api.signup", () => {
  it("A-4: faz POST /auth/signup e retorna SignupResponse", async () => {
    const signupResponse = {
      user: { id: "1", name: "João", username: "joao", email: "j@test.com" },
      token: { access_token: "acc", refresh_token: "ref", exp: 9999 },
    };
    mockFetch.mockResolvedValueOnce(makeResponse(signupResponse, 201));

    const result = await api.signup({
      name: "João",
      username: "joao",
      email: "j@test.com",
      password: "senha123",
    });

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/signup");
    expect(options.method).toBe("POST");
    expect(result).toEqual(signupResponse);
  });
});

// ─── api.getMe ────────────────────────────────────────────────────────────────

describe("api.getMe", () => {
  it("A-5: faz GET /session/me com header Authorization: Bearer <token>", async () => {
    const user = { id: "1", name: "João", username: "joao", email: "j@test.com" };
    mockFetch.mockResolvedValueOnce(makeResponse(user));

    await api.getMe("meu-access-token");

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/session/me");
    expect(options.method).toBe("GET");
    expect(
      (options.headers as Record<string, string>)["Authorization"],
    ).toBe("Bearer meu-access-token");
  });
});

// ─── api.refresh ──────────────────────────────────────────────────────────────

describe("api.refresh", () => {
  it("A-6: faz POST /auth/refresh com o refresh_token no body", async () => {
    const tokenResponse = {
      access_token: "novo-acc",
      refresh_token: "novo-ref",
      exp: 9999,
    };
    mockFetch.mockResolvedValueOnce(makeResponse(tokenResponse));

    const result = await api.refresh({ refresh_token: "old-ref" });

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/refresh");
    expect(options.method).toBe("POST");
    expect(options.body).toBe(JSON.stringify({ refresh_token: "old-ref" }));
    expect(result).toEqual(tokenResponse);
  });
});

// ─── api.logout ───────────────────────────────────────────────────────────────

describe("api.logout", () => {
  it("A-7: faz POST /auth/logout e aceita status 204 sem lançar erro", async () => {
    mockFetch.mockResolvedValueOnce(make204Response());

    await expect(
      api.logout({ refresh_token: "ref-token" }),
    ).resolves.toBeUndefined();

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/logout");
    expect(options.method).toBe("POST");
  });
});

// ─── Tratamento de erros ──────────────────────────────────────────────────────

describe("Tratamento de erros da API", () => {
  it("A-8: extrai mensagem de erro de detail como array (erros de validação FastAPI)", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(
        {
          detail: [
            { loc: ["body", "email"], msg: "E-mail inválido.", type: "value_error" },
          ],
        },
        422,
      ),
    );

    await expect(api.signup({ name: "", username: "", email: "x", password: "" }))
      .rejects.toMatchObject({
        name: "ApiError",
        status: 422,
        message: "E-mail inválido.",
      });
  });

  it("A-9: usa mensagem padrão quando a resposta de erro não contém detail", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({}, 500));

    await expect(api.login({ login: "x", password: "y" })).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
      message: "Ocorreu um erro inesperado.",
    });
  });

  it("ApiError possui propriedades name, status e data", () => {
    const error = new ApiError("msg", 403, { foo: "bar" });
    expect(error.name).toBe("ApiError");
    expect(error.status).toBe(403);
    expect(error.data).toEqual({ foo: "bar" });
    expect(error instanceof Error).toBe(true);
  });
});
