import type {
  GroupSummary,
  HabitProgress,
  HabitWithProgress,
  ProgressStatus,
} from "@/services/types/habits";
import type { HabitStatisticsItem } from "@/services/types/statistics";

// Hábitos de grupo nas telas pessoais (Home, Meus hábitos)

/**
 * Situação do progresso que dá para confiar. Em hábito de grupo ativo a API
 * manda `ended` por engano (bug L1); sem o dado certo, vale o que o número diz.
 */
export function progressStatus(
  habit: Pick<HabitWithProgress, "status" | "group">,
  progress: HabitProgress,
): ProgressStatus {
  if (habit.group && habit.status === "active" && progress.status === "ended") {
    const { done, target_count } = progress.current_period;
    return done >= target_count ? "completed" : "in_progress";
  }
  return progress.status;
}

/** Card de hábito da Home: o pessoal vem das estatísticas, o de grupo do /habits */
export type HomeHabit = Pick<
  HabitStatisticsItem,
  "habit_id" | "name" | "goal" | "current_period" | "status" | "checked_today"
> & {
  group?: GroupSummary | null;
};

/**
 * Hábitos de grupo ativos para a lista da Home. `datesByHabit` tem os dias com
 * check-in da própria pessoa; enquanto não chega, ninguém aparece feito hoje.
 */
export function groupHomeHabits(
  habits: HabitWithProgress[],
  datesByHabit: Record<string, Set<string>> | undefined,
  today: string,
): HomeHabit[] {
  return habits.flatMap((habit) => {
    // Sem meta não há o que mostrar no card (todo hábito de grupo tem, mas o tipo não garante)
    if (!habit.group || habit.status !== "active" || !habit.progress) {
      return [];
    }
    return [
      {
        habit_id: habit.id,
        name: habit.name,
        goal: habit.progress.goal,
        current_period: habit.progress.current_period,
        status: progressStatus(habit, habit.progress),
        checked_today: datesByHabit?.[habit.id]?.has(today) ?? false,
        group: habit.group,
      },
    ];
  });
}
