import type { StoredTokens } from "./token-storage";

// Na web não existe o cofre do celular (SecureStore). O localStorage não é
// seguro, então este arquivo serve só pra testar no navegador durante o
// desenvolvimento. O Metro escolhe o .web.ts sozinho quando roda na web.

const TOKENS_KEY = "habbit.auth.tokens";

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export async function getTokens(): Promise<StoredTokens | null> {
  const raw = localStorage.getItem(TOKENS_KEY);
  if (raw === null) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredTokens;
  } catch {
    await clearTokens();
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  localStorage.removeItem(TOKENS_KEY);
}
