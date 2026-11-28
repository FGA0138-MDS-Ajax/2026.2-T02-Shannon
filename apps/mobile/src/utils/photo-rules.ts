import type { CheckIn } from "@/services/types/habits";

// Abaixo do teto de 4,5 MB da Vercel, como no back.
export const PHOTO_MAX_BYTES = 4 * 1024 * 1024;
// Lado maior da imagem depois da redução.
export const PHOTO_MAX_DIMENSION = 1600;
export const SAO_PAULO_TIMEZONE = "America/Sao_Paulo";

/** `YYYY-MM-DD` no fuso de São Paulo, independente do fuso do aparelho. */
export function toSaoPauloDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** O check-in foi criado hoje no fuso de São Paulo? */
export function isCheckInFromToday(
  createdAt: string,
  now: Date = new Date(),
): boolean {
  return toSaoPauloDate(new Date(createdAt)) === toSaoPauloDate(now);
}

/**
 * Só o autor pode mexer na foto, e só no check-in de hoje (São Paulo). A API
 * também recusa os demais casos com 403/409.
 */
export function canManageCheckInPhoto(
  checkIn: Pick<CheckIn, "user_id" | "created_at">,
  userId: string | undefined,
  now: Date = new Date(),
): boolean {
  return (
    !!userId &&
    checkIn.user_id === userId &&
    isCheckInFromToday(checkIn.created_at, now)
  );
}

/**
 * Chave de cache do `expo-image`: o id do check-in + o caminho sem a query.
 * A URL assinada muda a cada resposta, então nunca pode ser a chave.
 */
export function photoCacheKey(checkInId: string, url: string): string {
  return `${checkInId}:${url.split("?")[0]}`;
}
