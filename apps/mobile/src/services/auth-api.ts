import { request } from "@/services/api";
import type {
  PasswordChange,
  TokenResponse,
  UserProfile,
  UserPublic,
  UserUpdate,
} from "@/services/types/auth";

/**
 * Chaves do SWR do perfil. O resumo e o usuário da sessão são recursos
 * diferentes: o primeiro traz as sequências e o total de check-ins.
 */
export const authKeys = {
  me: "/auth/session/me",
  profile: "/user/statistics/profile",
};

/** Dados atuais da conta (usados ao abrir a edição). */
export function getAccount(): Promise<UserPublic> {
  return request<UserPublic>(authKeys.me);
}

/** Resumo da trajetória do usuário logado (sequências e total de check-ins). */
export function getProfile(): Promise<UserProfile> {
  return request<UserProfile>(authKeys.profile);
}

/**
 * Edita a conta do usuário logado. Envie só os campos alterados; a API não
 * aceita `null`. Trocar o e-mail exige `current_password`.
 */
export function updateAccount(changes: UserUpdate): Promise<UserPublic> {
  return request<UserPublic>("/auth/session/me", {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

/**
 * Troca a senha. A API encerra todas as sessões e devolve um par de tokens
 * novo, que precisa substituir os dois tokens guardados antes de outra chamada.
 */
export function changePassword(body: PasswordChange): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/session/me/password", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
