import type {
  FeedItem,
  GroupHabit,
  GroupHabitStatistics,
  HabitRef,
} from "@/services/types/groups";
import type { HabitProgress } from "@/services/types/habits";

// Textos do feed do grupo. A API manda os dados soltos (autor, hábitos,
// horário); a frase do card é montada aqui.

/** `"caio"` → `"caio fez check-in em"` */
export function checkInPhrase(username: string): string {
  return `${username} fez check-in em`;
}

/** `[Pedalar]` → `"Pedalar"`; `[Pedalar, Ler, Meditar]` → `"Pedalar, Ler e Meditar"` */
export function joinHabitNames(habits: Pick<HabitRef, "name">[]): string {
  const names = habits.map((habit) => habit.name);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

// Um progresso por integrante em cada hábito do grupo
export type MemberProgressIndex = Map<string, HabitProgress>;

function progressKey(habitId: string, userId: string): string {
  return `${habitId}:${userId}`;
}

/** Junta as estatísticas de cada hábito (`GET /groups/{id}/habits/{hid}/stats`) num índice por hábito e integrante */
export function indexMemberProgress(
  stats: GroupHabitStatistics[],
): MemberProgressIndex {
  const index: MemberProgressIndex = new Map();
  for (const habitStats of stats) {
    for (const member of habitStats.members) {
      index.set(
        progressKey(habitStats.habit_id, member.user.id),
        member.progress,
      );
    }
  }
  return index;
}

export interface CheckInHabitDetail {
  habit: GroupHabit;
  // Progresso do autor do check-in nesse hábito. Falta se ele entrou depois.
  progress: HabitProgress | undefined;
}

/** Hábitos do check-in com meta, categoria e o progresso do autor, na ordem do feed */
export function checkInHabitDetails(
  item: Pick<FeedItem, "author" | "habits">,
  habitsById: Map<string, GroupHabit>,
  progress: MemberProgressIndex,
): CheckInHabitDetail[] {
  const details: CheckInHabitDetail[] = [];
  for (const { id } of item.habits) {
    const habit = habitsById.get(id);
    // Hábito que ainda não chegou na lista do grupo fica de fora
    if (!habit) continue;
    details.push({
      habit,
      progress: progress.get(progressKey(id, item.author.id)),
    });
  }
  return details;
}

/** Check-in mais novo da pessoa naquele hábito. O feed já vem do mais novo para o mais antigo. */
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

/** Dias com check-in no período sobre a meta: `"1 / 1 dia"`, `"3 / 4 dias"` */
export function periodProgressLabel(progress: HabitProgress): string {
  const { done, target_count } = progress.current_period;
  return `${done} / ${target_count} ${target_count === 1 ? "dia" : "dias"}`;
}
