import { useCallback } from "react";
import useSWR from "swr";
import {
  habitKeys,
  listHabitCheckIns,
  listHabits,
} from "@/services/habits-api";
import { statisticsKeys } from "@/services/statistics-api";
import type { HabitCategory } from "@/services/types/habits";
import { checkInDates } from "@/utils/habit-history";

/**
 * Dias com check-in de cada hábito e a categoria de cada um, para a grade de
 * 28 dias, a faixa da semana e o ícone dos cards da Home.
 * A API não tem um endpoint com tudo junto: é uma chamada por hábito.
 */
export function useHabitsCheckIns(habitIds: string[]) {
  const { data: datesByHabit, mutate: mutateDates } = useSWR(
    habitIds.length > 0 ? statisticsKeys.habitsCheckIns(habitIds) : null,
    async () => {
      const lists = await Promise.all(
        habitIds.map((id) => listHabitCheckIns(id)),
      );
      return Object.fromEntries(
        habitIds.map((id, index) => [id, checkInDates(lists[index])]),
      ) as Record<string, Set<string>>;
    },
    { keepPreviousData: true },
  );

  const { data: habits, mutate: mutateHabits } = useSWR(
    habitIds.length > 0 ? habitKeys.list() : null,
    () => listHabits(),
  );

  const categories = habits
    ? (Object.fromEntries(
        habits.map((habit) => [habit.id, habit.category]),
      ) as Record<string, HabitCategory>)
    : undefined;

  const refetch = useCallback(() => {
    mutateDates();
    mutateHabits();
  }, [mutateDates, mutateHabits]);

  return { datesByHabit, categories, refetch };
}
