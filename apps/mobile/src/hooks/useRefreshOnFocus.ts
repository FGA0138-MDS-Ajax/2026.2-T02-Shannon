import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

/**
 * Recarrega os dados sempre que a tela volta ao foco. Check-ins, metas e
 * grupos mudam em outras telas e a API não avisa. Passe uma função estável
 * (ex.: o `mutate` do SWR).
 */
export function useRefreshOnFocus(refresh: () => unknown) {
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
}
