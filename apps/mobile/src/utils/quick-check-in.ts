import type { CheckIn } from "@/services/types/habits";

// Limite de caracteres do título aceito pela API
export const TITLE_MAX = 150;

/**
 * Título padrão do check-in rápido: `"Pedalar #5"` quando a pessoa já fez 4.
 * Em hábito de grupo a API devolve os check-ins de todo mundo, por isso conta
 * só os de `userId`.
 */
export function nextCheckInTitle(
  habitName: string,
  checkIns: CheckIn[],
  userId: string | undefined,
): string {
  const mine = userId
    ? checkIns.filter((checkIn) => checkIn.user_id === userId)
    : checkIns;
  const suffix = ` #${mine.length + 1}`;
  // Nome muito longo: corta o nome, nunca o número
  return habitName.slice(0, TITLE_MAX - suffix.length) + suffix;
}

/** Chaves do SWR dos grupos: o check-in muda a roda, o feed e o ranking */
export function isGroupDataKey(key: unknown): boolean {
  const first = Array.isArray(key) ? key[0] : key;
  return typeof first === "string" && first.startsWith("/groups/");
}
