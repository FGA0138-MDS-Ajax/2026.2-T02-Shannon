import { Platform } from "react-native";
import {
  clearTokens,
  getTokens,
  type StoredTokens,
  saveTokens,
} from "@/services/token-storage";

export interface UserPublic {
  id: string;
  name: string;
  username: string;
  email: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  exp: number;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
  name: string;
}

export interface SignupResponse {
  user: UserPublic;
  token: TokenResponse;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface TokenRefreshRequest {
  refresh_token: string;
}

export interface LogoutRequest {
  refresh_token: string;
}

export interface ApiErrorDetail {
  loc?: (string | number)[];
  msg?: string;
  type?: string;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// Emulador Android usa 10.0.2.2 para acessar o host machine; iOS Simulator e Web usam 127.0.0.1
const DEFAULT_API_URL =
  Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://127.0.0.1:8000";

export const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

export function toStoredTokens(tokens: TokenResponse): StoredTokens {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    exp: tokens.exp,
  };
}

// O api.ts não pode importar o SessionProvider (estado do React só existe
// dentro de componentes), então o Provider registra estes callbacks.
export type AuthHandlers = {
  // Sincroniza a sessão em memória: o refresh token antigo já foi queimado.
  onTokensRefreshed: (tokens: StoredTokens) => void;
  // O refresh foi recusado: a sessão acabou e a pessoa volta para o login.
  onAuthFailure: () => void;
};

let authHandlers: AuthHandlers | null = null;

export function setAuthHandlers(handlers: AuthHandlers | null): void {
  authHandlers = handlers;
}

// Refresh em andamento. O back rotaciona o refresh token e derruba a sessão se
// um token antigo for reusado, então requisições que recebem 401 juntas
// precisam esperar o mesmo refresh em vez de cada uma disparar o seu.
let refreshPromise: Promise<StoredTokens | null> | null = null;

/**
 * Devolve tokens válidos depois de um 401 em `failedAccessToken`, ou `null`
 * se a sessão acabou.
 */
function refreshTokens(
  failedAccessToken: string,
): Promise<StoredTokens | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh(failedAccessToken).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doRefresh(
  failedAccessToken: string,
): Promise<StoredTokens | null> {
  const stored = await getTokens();
  if (!stored) return null;

  // Outro refresh já terminou enquanto esta requisição estava no ar.
  if (stored.accessToken !== failedAccessToken) return stored;

  try {
    const res = await api.refresh({ refresh_token: stored.refreshToken });
    const tokens = toStoredTokens(res);
    await saveTokens(tokens);
    authHandlers?.onTokensRefreshed(tokens);
    return tokens;
  } catch (error) {
    // Falha de rede não encerra a sessão: só a recusa do servidor encerra.
    if (!(error instanceof ApiError)) throw error;

    await clearTokens();
    authHandlers?.onAuthFailure();
    return null;
  }
}

export type QueryParams = Record<string, string | number | undefined>;

/** Monta `?a=1&b=2`, ignorando valores `undefined`. */
export function toQueryString(params: QueryParams = {}): string {
  const pairs = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );

  return pairs.length > 0 ? `?${pairs.join("&")}` : "";
}

// `auth: false` nas rotas públicas: sem Bearer e sem refresh no 401 (um login
// com senha errada também responde 401).
export type RequestOptions = RequestInit & { auth?: boolean };

export async function request<T>(
  endpoint: string,
  { auth = true, ...options }: RequestOptions = {},
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  // Só o token que o próprio request() anexou é renovado aqui. Quem manda o
  // header na mão (getMe) cuida do próprio refresh no SessionProvider.
  let sentAccessToken: string | null = null;

  if (auth && !headers.Authorization) {
    const tokens = await getTokens();
    if (tokens) {
      sentAccessToken = tokens.accessToken;
      headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
  }

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401 && sentAccessToken) {
    const tokens = await refreshTokens(sentAccessToken);
    if (tokens) {
      headers.Authorization = `Bearer ${tokens.accessToken}`;
      response = await fetch(url, { ...options, headers });
    }
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    let errorMessage = "Ocorreu um erro inesperado.";

    if (data?.detail) {
      if (typeof data.detail === "string") {
        errorMessage = data.detail;
      } else if (Array.isArray(data.detail) && data.detail.length > 0) {
        // FastAPI validation errors: [{ loc: [...], msg: "..." }]
        const firstError = data.detail[0] as ApiErrorDetail;
        errorMessage = firstError.msg || "Erro de validação.";
      }
    }

    throw new ApiError(errorMessage, response.status, data);
  }

  return data as T;
}

export const api = {
  async signup(body: SignupRequest): Promise<SignupResponse> {
    return request<SignupResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(body),
      auth: false,
    });
  },

  async login(body: LoginRequest): Promise<TokenResponse> {
    return request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
      auth: false,
    });
  },

  async refresh(body: TokenRefreshRequest): Promise<TokenResponse> {
    return request<TokenResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify(body),
      auth: false,
    });
  },

  // O back identifica a sessão pelo refresh token do corpo, sem Bearer.
  async logout(body: LogoutRequest): Promise<void> {
    return request<void>("/auth/logout", {
      method: "POST",
      body: JSON.stringify(body),
      auth: false,
    });
  },

  async getMe(accessToken: string): Promise<UserPublic> {
    return request<UserPublic>("/auth/session/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
};
