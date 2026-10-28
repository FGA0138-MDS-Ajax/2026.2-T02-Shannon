import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  api,
  type LoginRequest,
  type SignupRequest,
  setAuthHandlers,
  toStoredTokens,
  type UserPublic,
} from "@/services/api";
import {
  clearTokens,
  getTokens,
  type StoredTokens,
  saveTokens,
} from "@/services/token-storage";

export interface AuthContextType {
  user: UserPublic | null;
  session: StoredTokens | null;
  isLoading: boolean;
  signIn: (credentials: LoginRequest) => Promise<void>;
  signUp: (data: SignupRequest) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshSession: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [session, setSession] = useState<StoredTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ref para acessar session corrente sem depender dela nos callbacks,
  // evitando loops de re-render ao atualizar session.
  const sessionRef = useRef(session);
  sessionRef.current = session;

  /** Aplica um par de tokens no estado e persiste no storage. */
  const applySession = useCallback(
    async (tokens: StoredTokens, currentUser: UserPublic) => {
      await saveTokens(tokens);
      setSession(tokens);
      setUser(currentUser);
    },
    [],
  );

  /** Limpa toda a sessão (estado + storage). */
  const resetSession = useCallback(async () => {
    await clearTokens();
    setUser(null);
    setSession(null);
  }, []);

  /** Tenta renovar o access token usando o refresh token armazenado. */
  const tryRefresh = useCallback(
    async (refreshToken: string): Promise<boolean> => {
      try {
        const tokenRes = await api.refresh({ refresh_token: refreshToken });
        const tokens = toStoredTokens(tokenRes);
        const currentUser = await api.getMe(tokens.accessToken);
        await applySession(tokens, currentUser);
        return true;
      } catch {
        return false;
      }
    },
    [applySession],
  );

  // O request() renova o token sozinho no 401. Sem este aviso, a sessão em
  // memória guardaria o refresh token antigo, que o back já invalidou.
  useEffect(() => {
    setAuthHandlers({
      onTokensRefreshed: (tokens) => setSession(tokens),
      // Os tokens já foram apagados do storage; sem sessão, o
      // Stack.Protected manda a pessoa de volta para a entrada.
      onAuthFailure: () => {
        setUser(null);
        setSession(null);
      },
    });

    return () => setAuthHandlers(null);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const stored = await getTokens();
        if (!stored) return;

        try {
          const currentUser = await api.getMe(stored.accessToken);
          setUser(currentUser);
          setSession(stored);
          return;
        } catch {
          // Access token inválido — tenta refresh
        }

        if (await tryRefresh(stored.refreshToken)) return;
      } catch {
        // Qualquer erro inesperado
      }

      await resetSession();
    };

    init().finally(() => setIsLoading(false));
  }, [resetSession, tryRefresh]);

  const signIn = useCallback(
    async (credentials: LoginRequest) => {
      const tokenRes = await api.login(credentials);
      const tokens = toStoredTokens(tokenRes);
      const currentUser = await api.getMe(tokens.accessToken);
      await applySession(tokens, currentUser);
    },
    [applySession],
  );

  const signUp = useCallback(
    async (data: SignupRequest) => {
      const res = await api.signup(data);
      await applySession(toStoredTokens(res.token), res.user);
    },
    [applySession],
  );

  const signOut = useCallback(async () => {
    try {
      const refreshToken = sessionRef.current?.refreshToken;
      if (refreshToken) {
        await api.logout({ refresh_token: refreshToken });
      }
    } catch {
      // Ignora falha de rede ao deslogar
    }

    await resetSession();
  }, [resetSession]);

  const refreshSession = useCallback(async () => {
    const refreshToken = sessionRef.current?.refreshToken;
    if (!refreshToken) return;

    const ok = await tryRefresh(refreshToken);
    if (!ok) await resetSession();
  }, [tryRefresh, resetSession]);

  const value = useMemo(
    () => ({
      user,
      session,
      isLoading,
      signIn,
      signUp,
      signOut,
      refreshSession,
    }),
    [user, session, isLoading, signIn, signUp, signOut, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useSession deve ser usado dentro de um SessionProvider");
  }
  return context;
}
