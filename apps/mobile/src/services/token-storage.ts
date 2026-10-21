import * as SecureStore from "expo-secure-store";

//Formato do tokens guardados
// Quando o access token vence, em segundos desde 1970 (campo `exp` da API).
export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  exp: number;
};

const TOKENS_KEY = "habbit.auth.tokens";

// Função que salva os tokens, await pois espera acabar por completo
// para assim retornar
export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
}

// faz o Get dos tokens
export async function getTokens(): Promise<StoredTokens | null> {
  const raw = await SecureStore.getItemAsync(TOKENS_KEY);

  if (raw === null) {
    return null;
  }

  try {
    // tenta fazer um parse para retornar como StoredTokens
    return JSON.parse(raw) as StoredTokens;
  } catch {
    await clearTokens();
    return null;
  }
}

// Limpa os tokens
export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKENS_KEY);
}
