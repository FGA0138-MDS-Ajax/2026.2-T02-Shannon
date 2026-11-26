import { useState } from "react";

/**
 * Estado do "puxar para atualizar": o indicador aparece só enquanto a busca
 * pedida pelo gesto não termina (recargas ao voltar à tela não o mostram).
 */
export function usePullToRefresh(refresh: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  return { refreshing, onRefresh };
}
