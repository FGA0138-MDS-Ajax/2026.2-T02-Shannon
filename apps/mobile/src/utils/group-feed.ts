import { currentPeriodPhrases } from "@/config/goal-labels";
import type { FeedItem, GroupHabit } from "@/services/types/groups";
import type { HabitProgress } from "@/services/types/habits";
import { findMemberProgress, type MemberPeriod } from "@/utils/group-period";

// Textos e cruzamentos do feed do grupo. A API manda autor, hábitos e horário
// soltos; a frase do card e o progresso de cada hábito são montados aqui.

/** `[Pedalar]` → `"Pedalar"`; `[Pedalar, Ler, Meditar]` → `"Pedalar, Ler e Meditar"` */
export function joinHabitNames(habits: { name: string }[]): string {
  const names = habits.map((habit) => habit.name);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

export interface CheckInHabitDetail {
  habit: GroupHabit;
  /** Progresso do autor nesse hábito. Falta se ele não tem a meta (ex.: entrou depois). */
  progress: HabitProgress | undefined;
}

/**
 * Hábitos ativos do check-in com meta, categoria e o progresso do autor, na
 * ordem do feed. Hábito já encerrado fica de fora: o card mostra só o nome.
 */
export function checkInHabitDetails(
  item: Pick<FeedItem, "author" | "habits">,
  habitsById: Map<string, GroupHabit>,
  members: MemberPeriod[],
): CheckInHabitDetail[] {
  return item.habits.flatMap(({ id }) => {
    const habit = habitsById.get(id);
    if (!habit) return [];
    return [
      { habit, progress: findMemberProgress(members, item.author.id, id) },
    ];
  });
}

/** Check-in mais novo da pessoa no hábito (o feed vem do mais novo ao mais antigo) */
export function latestCheckIn(
  items: FeedItem[],
  userId: string,
  habitId: string,
): FeedItem | undefined {
  return items.find(
    (item) =>
      item.author.id === userId &&
      item.habits.some((habit) => habit.id === habitId),
  );
}

/** Dias com check-in sobre a meta do período: `"1 de 1 hoje"`, `"2 de 3 nesta semana"` */
export function periodProgressLabel(progress: HabitProgress): string {
  const { done, target_count } = progress.current_period;
  return `${done} de ${target_count} ${currentPeriodPhrases[progress.goal.period]}`;
}
