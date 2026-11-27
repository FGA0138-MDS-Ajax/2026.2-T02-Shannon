import { useFocusEffect } from "expo-router";
import { useCallback, useSyncExternalStore } from "react";

// Título da tela em foco que troca o padrão da rota (ex.: nome do grupo)
let focusedTitle: string | undefined;
const listeners = new Set<() => void>();

function setFocusedTitle(title: string | undefined) {
  focusedTitle = title;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Troca o título da aba do navegador (PWA) enquanto a tela está em foco. Ao
 * sair dela, volta o título padrão da rota (`config/page-titles`).
 */
export function usePageTitle(title: string | undefined) {
  useFocusEffect(
    useCallback(() => {
      if (!title) return;
      setFocusedTitle(title);
      return () => setFocusedTitle(undefined);
    }, [title]),
  );
}

/** Título escolhido pela tela em foco, se houver */
export function useFocusedPageTitle() {
  return useSyncExternalStore(
    subscribe,
    () => focusedTitle,
    () => undefined,
  );
}
