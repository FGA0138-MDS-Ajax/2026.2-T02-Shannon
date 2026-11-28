import { ApiError } from "@/services/api";
import {
  FORM_ERROR_KEY,
  getErrorMessage,
  getFieldErrors,
} from "@/services/api-errors";

export type AccountField =
  | "name"
  | "username"
  | "email"
  | "current_password";

export type PasswordField =
  | "current_password"
  | "new_password"
  | "new_password_confirmation";

const EMAIL_WORDS = ["e-mail", "email"];

function isEmailMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return EMAIL_WORDS.some((word) => normalized.includes(word));
}

function isPasswordMessage(message: string): boolean {
  return message.toLowerCase().includes("senha");
}

function isUsernameMessage(message: string): boolean {
  return message.toLowerCase().includes("username");
}

/**
 * Erros do PATCH /auth/session/me já no campo certo. O 422 vem com `loc`; o
 * 400 (senha atual) e os 409 (username/e-mail em uso) vêm só com `detail`, e
 * o texto da API é a única forma de saber o campo.
 */
export function getAccountFieldErrors(
  error: unknown,
): Partial<Record<AccountField, string>> {
  const fieldErrors = getFieldErrors(error) as Record<string, string>;
  const { [FORM_ERROR_KEY]: bodyError, ...perField } = fieldErrors;
  const mapped = perField as Partial<Record<AccountField, string>>;

  if (error instanceof ApiError) {
    const message = bodyError ?? getErrorMessage(error);

    if (error.status === 400 && isPasswordMessage(message)) {
      return { current_password: message };
    }

    if (error.status === 409) {
      if (isUsernameMessage(message)) return { username: message };
      if (isEmailMessage(message)) return { email: message };
    }

    // `model_validator` do e-mail sem senha chega em `body`, sem `loc` de campo.
    if (error.status === 422 && bodyError) {
      if (isPasswordMessage(bodyError)) return { current_password: bodyError };
      if (isEmailMessage(bodyError)) return { email: bodyError };
    }
  }

  return mapped;
}

/** Erros do PUT /auth/session/me/password no campo correspondente. */
export function getPasswordFieldErrors(
  error: unknown,
): Partial<Record<PasswordField, string>> {
  const fieldErrors = getFieldErrors(error) as Record<string, string>;
  const { [FORM_ERROR_KEY]: bodyError, ...perField } = fieldErrors;
  const mapped = perField as Partial<Record<PasswordField, string>>;

  if (error instanceof ApiError) {
    const message = bodyError ?? getErrorMessage(error);

    if (error.status === 400 && isPasswordMessage(message)) {
      return { current_password: message };
    }

    if (error.status === 422 && bodyError) {
      if (bodyError.toLowerCase().includes("confirma")) {
        return { new_password_confirmation: bodyError };
      }
      if (bodyError.toLowerCase().includes("diferente da atual")) {
        return { new_password: bodyError };
      }
    }
  }

  return mapped;
}
