import type { HabitOption, HabitProgress } from "@/services/types/habits";

// Um hábito do check-in já com o nome, pronto pra exibir
export interface CheckInProgressItem {
  name: string;
  progress: HabitProgress;
}

// A API não traz o nome nem garante a ordem do `progress`, então casa pelo id.
// Hábito sem meta não vem no `progress` e fica de fora.
export function matchCheckInProgress(
  habits: Pick<HabitOption, "id" | "name">[],
  progress: HabitProgress[],
): CheckInProgressItem[] {
  const progressByHabitId = new Map(
    progress.map((item) => [item.habit_id, item]),
  );

  const items: CheckInProgressItem[] = [];
  for (const habit of habits) {
    const habitProgress = progressByHabitId.get(habit.id);
    if (!habitProgress) continue;
    items.push({ name: habit.name, progress: habitProgress });
  }
  return items;
}
