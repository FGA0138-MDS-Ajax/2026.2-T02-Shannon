import { ApiError, type ApiErrorDetail } from "@/services/api";

const NETWORK_ERROR_MESSAGE =
  "Não foi possível conectar ao servidor. Verifique sua internet.";

// Usadas quando o `detail` não vem como texto.
const STATUS_MESSAGES: Record<number, string> = {
  401: "Sua sessão expirou. Entre novamente.",
  403: "Você não tem permissão para fazer isso.",
  404: "Não encontrado.",
  409: "Esta ação não pode ser feita agora.",
  422: "Confira os campos destacados.",
};

const SERVER_ERROR_MESSAGE = "Erro no servidor. Tente de novo em instantes.";

// Erro de um ValueError do Pydantic chega com esse prefixo.
const PYDANTIC_VALUE_ERROR_PREFIX = "Value error, ";

// Chave de getFieldErrors para erros do corpo inteiro, sem campo específico.
export const FORM_ERROR_KEY = "_form";

function getDetail(error: ApiError): unknown {
  if (error.data && typeof error.data === "object" && "detail" in error.data) {
    return error.data.detail;
  }
  return undefined;
}

/** Frase para mostrar na tela, para qualquer erro vindo da API ou da rede. */
export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    // O fetch só lança sozinho quando a requisição nem chega ao servidor.
    return NETWORK_ERROR_MESSAGE;
  }

  if (error.status >= 500) {
    return SERVER_ERROR_MESSAGE;
  }

  // Os textos do back (403, 404, 409 e alguns 422) já são para o usuário.
  const detail = getDetail(error);
  if (typeof detail === "string") {
    return detail;
  }

  return STATUS_MESSAGES[error.status] ?? "Ocorreu um erro inesperado.";
}

/**
 * Transforma a lista do 422 em `{ campo: mensagem }` usando o `loc`
 * (ex.: `["body", "name"]` vira `name`). Fica só a primeira mensagem de cada
 * campo. Erros sem campo vão em `FORM_ERROR_KEY`.
 */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.status !== 422) return {};

  const detail = getDetail(error);
  if (!Array.isArray(detail)) return {};

  const fieldErrors: Record<string, string> = {};

  for (const item of detail as ApiErrorDetail[]) {
    // `loc` começa pela origem ("body", "query"); o campo é o último texto.
    const path = (item.loc ?? []).slice(1);
    const field = path.filter((part) => typeof part === "string").pop();
    const key = field ?? FORM_ERROR_KEY;

    if (key in fieldErrors) continue;

    const message = item.msg ?? STATUS_MESSAGES[422];
    fieldErrors[key] = message.startsWith(PYDANTIC_VALUE_ERROR_PREFIX)
      ? message.slice(PYDANTIC_VALUE_ERROR_PREFIX.length)
      : message;
  }

  return fieldErrors;
}

/**
 * `habit_ids` recusados no POST /check-ins (404, 403 ou 409). Lista vazia se
 * o erro não for uma recusa.
 */
export function getRejectedHabitIds(error: unknown): string[] {
  if (!(error instanceof ApiError)) return [];
  if (![403, 404, 409].includes(error.status)) return [];

  const data = error.data;
  if (data && typeof data === "object" && "habit_ids" in data) {
    const ids = data.habit_ids;
    if (Array.isArray(ids)) {
      return ids.filter((id): id is string => typeof id === "string");
    }
  }

  return [];
}
