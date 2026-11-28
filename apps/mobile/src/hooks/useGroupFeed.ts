import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { router } from "expo-router";
import { request } from "@/services/api";
import { ApiError } from "@/services/api";
import { groupKeys } from "@/services/groups-api";
import type { FeedItem, FeedPage } from "@/services/types/groups";

const PAGE_SIZE = 20;
/** Atualização automática em primeiro plano: 10 a 15 segundos */
const REFRESH_MS = 12_000;
/** 422 da API quando o cursor não vale mais: recarrega do zero */
const MSG_INVALID_CURSOR = "Cursor inválido.";

/** Deduplica por `id`, preservando a ordem já fornecida pela API. */
export function dedupeById(items: FeedItem[]): FeedItem[] {
  const seen = new Set<string>();
  const out: FeedItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/**
 * Check-ins do grupo, do mais novo ao mais antigo, paginados pelo cursor
 * opaco. Atualiza sozinho em primeiro plano com `after`, e nunca perde o que
 * já carregou por causa de erro.
 */
export function useGroupFeed(groupId: string) {
  const [items, setItems] = useState<FeedItem[] | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const itemsRef = useRef<FeedItem[]>([]);
  const nextCursorRef = useRef<string | null>(null);
  const stoppedRef = useRef(false);
  const foregroundRef = useRef(true);
  const reloadRef = useRef<() => Promise<void>>(async () => {});

  const setItemsSafe = useCallback((next: FeedItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const handleFeedError = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.status === 422) {
      // Cursor inválido: recarrega o feed do zero
      if (
        err.message === MSG_INVALID_CURSOR ||
        /cursor inválido/i.test(err.message)
      ) {
        void reloadRef.current();
        return;
      }
      setError(err);
      return;
    }
    if (err instanceof ApiError && err.status === 404) {
      // Grupo sumiu: para a atualização e volta para a lista
      stoppedRef.current = true;
      router.replace("/(app)/(tabs)/groups");
      return;
    }
    // Outros erros não destroem o que já carregou
    setError(err);
  }, []);

  /** Recarrega tudo do zero (abertura, foco, cursor inválido). */
  const reload = useCallback(async () => {
    if (stoppedRef.current) return;
    try {
      const page = await request<FeedPage>(
        groupKeys.feed(groupId, { limit: PAGE_SIZE }),
      );
      const merged = dedupeById(page.items);
      setItemsSafe(merged);
      nextCursorRef.current = page.next_cursor;
      setHasMore(page.has_more);
      setError(null);
    } catch (err) {
      handleFeedError(err);
    }
  }, [groupId, setItemsSafe, handleFeedError]);
  reloadRef.current = reload;

  /** Atualização em segundo plano: `after` o cursor do item mais novo. */
  const refresh = useCallback(async () => {
    if (stoppedRef.current || !foregroundRef.current) return;
    // Ainda sem nada carregado: simples reload
    if (itemsRef.current.length === 0) return reload();
    try {
      let after: string | undefined = itemsRef.current[0]?.cursor;
      let guard = 0;
      // Repete com o cursor do primeiro item enquanto has_more
      while (after && guard < 50) {
        guard += 1;
        const page: FeedPage = await request<FeedPage>(
          groupKeys.feed(groupId, { limit: PAGE_SIZE, after }),
        );
        if (page.items.length > 0) {
          const merged = dedupeById([...page.items, ...itemsRef.current]);
          setItemsSafe(merged);
          after = itemsRef.current[0]?.cursor;
        }
        if (!page.has_more) break;
        if (page.items.length === 0) break;
        after = itemsRef.current[0]?.cursor;
      }
      setError(null);
    } catch (err) {
      handleFeedError(err);
    }
  }, [groupId, reload, setItemsSafe, handleFeedError]);

  /** Página anterior (mais antiga): `before`, nunca junto com `after`. */
  const loadMore = useCallback(async () => {
    const before = nextCursorRef.current;
    if (stoppedRef.current || loadingMore || !hasMore || !before) return;
    setLoadingMore(true);
    try {
      const page = await request<FeedPage>(
        groupKeys.feed(groupId, { limit: PAGE_SIZE, before }),
      );
      setItemsSafe(dedupeById([...itemsRef.current, ...page.items]));
      nextCursorRef.current = page.next_cursor;
      setHasMore(page.has_more);
      setError(null);
    } catch (err) {
      handleFeedError(err);
    } finally {
      setLoadingMore(false);
    }
  }, [groupId, hasMore, loadingMore, setItemsSafe, handleFeedError]);

  // Abertura / foco: recarrega; também quando volta ao primeiro plano
  useEffect(() => {
    stoppedRef.current = false;
    foregroundRef.current =
      AppState.currentState !== "background" &&
      AppState.currentState !== "inactive";
    void reload();
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      const active = state === "active";
      foregroundRef.current = active;
      if (active && !stoppedRef.current) void refresh();
    });
    return () => sub?.remove?.();
  }, [reload, refresh]);

  // Atualização automática em primeiro plano com a tela aberta
  useEffect(() => {
    const timer = setInterval(() => {
      if (stoppedRef.current || !foregroundRef.current) return;
      void refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  return {
    items,
    error,
    hasMore,
    loadingMore,
    loadMore: () => void loadMore(),
    refresh: reload,
    /** Atualização em segundo plano com `after` (repete enquanto has_more). */
    refreshLatest: refresh,
  };
}

export type GroupFeed = ReturnType<typeof useGroupFeed>;
