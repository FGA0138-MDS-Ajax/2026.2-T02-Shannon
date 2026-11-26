import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { listHabitCheckIns, listHabits } from "@/services/habits-api";
import type { HabitCategory } from "@/services/types/habits";
import { checkInDates } from "@/utils/habit-history";

/**
 * Chaves do SWR com dados da Home. Depois de um check-in, recarregue-as com
 * `mutate(isHomeDataKey)` para a grade e as bolinhas atualizarem na hora.
 */
export function isHomeDataKey(key: unknown): boolean {
  if (key === "/habits") return true;
  return (
    Array.isArray(key) &&
    (key[0] === "/user/statistics" || key[0] === "/habits/check-ins")
  );
}

/**
 * Dias com check-in de cada hábito e a categoria de cada um, para a grade de
 * 28 dias, a faixa da semana e o ícone dos cards da Home. Também devolve a
 * lista de hábitos, que traz os de grupo (as estatísticas só têm os pessoais).
 * A API não tem um endpoint com tudo junto: é uma chamada por hábito.
 */
export function useHabitsCheckIns(habitIds: string[], userId?: string) {
  const { data: habits, mutate: mutateHabits } = useSWR("/habits", () =>
    listHabits(),
  );

  // Os pessoais das estatísticas e os de grupo ativos da lista
  const historyIds = useMemo(() => {
    const groupIds = (habits ?? [])
      .filter((habit) => habit.group && habit.status === "active")
      .map((habit) => habit.id);
    return [...new Set([...habitIds, ...groupIds])];
  }, [habitIds, habits]);

  const { data: datesByHabit, mutate: mutateDates } = useSWR(
    historyIds.length > 0 ? ["/habits/check-ins", userId, ...historyIds] : null,
    async () => {
      const lists = await Promise.all(
        historyIds.map((id) => listHabitCheckIns(id)),
      );
      return Object.fromEntries(
        historyIds.map((id, index) => [
          id,
          // Em hábito de grupo vêm os check-ins de todo mundo: só os seus contam
          checkInDates(
            userId
              ? lists[index].filter((checkIn) => checkIn.user_id === userId)
              : lists[index],
          ),
        ]),
      ) as Record<string, Set<string>>;
    },
    { keepPreviousData: true },
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

  return { habits, datesByHabit, categories, refetch };
}
