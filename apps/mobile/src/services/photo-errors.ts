import { ApiError } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";

export type PhotoErrorAction = "retry" | "hide" | "back" | "none";

export interface PhotoErrorInfo {
  message: string;
  action: PhotoErrorAction;
}

function detailOf(error: ApiError): string | null {
  const data = error.data;
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
  }
  return null;
}

/**
 * Traduz os erros do upload/remoção de foto. `hide` esconde os controles
 * (403/409); `back` sai da tela (404); `retry` mantém a prévia e permite
 * tentar de novo com o mesmo arquivo (503 e falha de rede).
 */
export function getPhotoErrorInfo(error: unknown): PhotoErrorInfo {
  if (!(error instanceof ApiError)) {
    return { message: getErrorMessage(error), action: "retry" };
  }

  switch (error.status) {
    case 400:
      return {
        message: "Arquivo de imagem inválido. Escolha outra foto.",
        action: "none",
      };
    case 403:
    case 409:
      return {
        message: getErrorMessage(error),
        action: "hide",
      };
    case 404:
      return { message: "Check-in não encontrado.", action: "back" };
    case 413:
      // A Vercel pode cortar antes da API e responder sem JSON.
      return { message: "A foto deve ter no máximo 4 MB.", action: "none" };
    case 415:
      return {
        message: "Formato não suportado. Envie uma imagem JPEG ou PNG.",
        action: "none",
      };
    case 503:
      return {
        message:
          detailOf(error) ?? "Não foi possível salvar a foto. Tente novamente.",
        action: "retry",
      };
    default:
      return { message: getErrorMessage(error), action: "none" };
  }
}
