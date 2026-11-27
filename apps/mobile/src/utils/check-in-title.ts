import type { CheckIn } from "@/services/types/habits";

/** Limite de caracteres do título aceito pela API */
export const CHECK_IN_TITLE_MAX = 150;

/**
 * Título pronto do check-in rápido: `"Pedalar #5"` quando a pessoa já fez 4.
 * Em hábito de grupo a API devolve os check-ins de todo mundo, por isso só
 * contam os de `userId`. Nome muito longo: corta o nome, nunca o número.
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
  return habitName.slice(0, CHECK_IN_TITLE_MAX - suffix.length) + suffix;
}
