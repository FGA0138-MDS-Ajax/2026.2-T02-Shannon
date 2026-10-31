import { Platform } from "react-native";
import type { StoredTokens } from "@/services/token-storage";

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

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

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
    });
  },

  async login(body: LoginRequest): Promise<TokenResponse> {
    return request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async refresh(body: TokenRefreshRequest): Promise<TokenResponse> {
    return request<TokenResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async logout(body: LogoutRequest): Promise<void> {
    return request<void>("/auth/logout", {
      method: "POST",
      body: JSON.stringify(body),
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
