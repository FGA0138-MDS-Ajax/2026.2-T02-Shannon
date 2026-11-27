// Espelho dos schemas de autenticação da API (rotas /auth).

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
