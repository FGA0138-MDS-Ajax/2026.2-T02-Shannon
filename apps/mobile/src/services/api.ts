//importa o clientHTTP
import axios from "axios";

// Uma instância única do cliente HTTP, todas as
// chamdas à API passam por aqui
export const api = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL,
    timeout: 10000,
});

// let porque setAccessTokenGetter troca o null pela função do AuthProvider
let getAccessToken: (() => string | null) | null = null;

export function setAccessTokenGetter(getter: () => string | null): void {
    getAccessToken = getter; //guarda a função pra usar depois
}

//Interceptador
// roda ANTES de cada chamada sair para a API
api.interceptors.request.use((config) => {
    const token = getAccessToken?.();

    if (token) {
        //monta o HEADER que a API espera
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

