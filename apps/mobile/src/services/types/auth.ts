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

// PATCH /auth/session/me: só os campos enviados mudam. `current_password` é
// exigido apenas quando o e-mail muda.
export interface UserUpdate {
  name?: string;
  username?: string;
  email?: string;
  current_password?: string;
}

// PUT /auth/session/me/password: a resposta traz um par de tokens novo.
export interface PasswordChange {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

export interface ActivityStreak {
  current: number;
  best: number;
}

// GET /user/statistics/profile
export interface UserProfile {
  id: string;
  name: string;
  username: string;
  activity_streak: ActivityStreak;
  check_ins_total: number;
}
