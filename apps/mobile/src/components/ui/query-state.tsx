import type { ReactNode } from "react";
import { ApiError } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import { CenteredMessage, ErrorBanner, Loading } from "./feedback";

export interface QueryStateProps<T> {
  data: T | undefined;
  error: unknown;
  onRetry: () => void;
  /** Mensagem para o 404 (ex.: "Hábito não encontrado."). Sem ela, vira erro comum. */
  notFoundMessage?: string;
  loadingTestID?: string;
  /** Conteúdo com o dado já carregado */
  children: (data: T) => ReactNode;
}

/**
 * Regra única de carregamento das telas de detalhe: 404 vira mensagem,
 * erro sem dado vira faixa com "Tentar novamente" e, enquanto não chega,
 * mostra o carregando. Com dado em cache, o erro de uma revalidação não
 * esconde a tela.
 */
export function QueryState<T>({
  data,
  error,
  onRetry,
  notFoundMessage,
  loadingTestID,
  children,
}: QueryStateProps<T>) {
  if (notFoundMessage && error instanceof ApiError && error.status === 404) {
    return <CenteredMessage message={notFoundMessage} />;
  }
  if (error && data === undefined) {
    return <ErrorBanner message={getErrorMessage(error)} onRetry={onRetry} />;
  }
  if (data === undefined) return <Loading testID={loadingTestID} fill />;
  return <>{children(data)}</>;
}
