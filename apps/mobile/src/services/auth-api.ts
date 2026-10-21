//importa o cliente HTTP (o arquivo api.ts)
import { api } from "./api";

// Importa so o tipo e não código, o Stored Tokens é o retorno
import type { StoredTokens } from "./token-storage";

// dto que vem do backend (sem export pois é private)
type TokenResponse = {
    access_token: string;
    refresh_token: string;
    exp: number
}
// resposta de /auth/signup
type SignupResponse = {
  user: User;
  token: TokenResponse;
};

// User publico sem senha. Publico pois as telas vão usar essa info
export type User = {
    id: string;
    name: string;
    username: string;
    email: string;
};

//DTO que a tela de cadastro precisa mandar (igual ao backend)
export type SignupData = {
    name: string;
    username: string;
    email: string;
    password: string;
};

// pega os dados do backend (snake_case) e passa para o app no formato correto
function toStoredTokens(response: TokenResponse): StoredTokens {
    return {
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        exp: response.exp
    }
}

//____________________________________________________________
// ENDPOINTS
//____________________________________________________________

//POST/auth/login
//identifier = username ou email

export async function login(
    identifier: string,
    password: string,
) : Promise<StoredTokens> {

    const { data } = await api.post<TokenResponse>("/auth/login", {
        login: identifier,
        password,
    });

    return toStoredTokens(data);

}


//POST /auth/signup
// Devolve usuário logado

export async function signup(
    input: SignupData,
): Promise <{ user: User; tokens: StoredTokens}> {

    const { data } = await api.post<SignupResponse>("/auth/signup", input);

    return {
        user: data.user,
        tokens: toStoredTokens(data.token),
    };
}

// POST /auth/refresh
// quando o access token vencer

export async function refresh(refreshToken: string): Promise<StoredTokens> {
    const { data } = await api.post<TokenResponse>("/auth/refresh", {
        refresh_token: refreshToken,
    });

    return toStoredTokens(data);
}

// POST /auth/logout

export async function logout(refreshToken: string): Promise<void> {
    await api.post("/auth/logout", { refresh_token: refreshToken });
}

// GET /session/me

export async function getMe(): Promise<User> {
    const { data } = await api.get<User>("/session/me");

    return data;
}