import { type Href, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import {
  StatisticsContent,
  StatisticsEmpty,
  StatisticsError,
  StatisticsFilters,
  StatisticsSkeleton,
} from "@/components/statistics";
import { useHabitsCheckIns } from "@/hooks/useHabitsCheckIns";
import { useSession } from "@/hooks/useSession";
import {
  isValidDays,
  MAX_DAYS,
  MIN_DAYS,
  useUserStatistics,
} from "@/hooks/useUserStatistics";
import type { StatisticsMode } from "@/services/types/statistics";
import { buildHabitHistory, buildWeekProgress } from "@/utils/habit-history";

type Filters = { mode: StatisticsMode; days: number };

function withToday(
  datesByHabit: Record<string, Set<string>>,
  habits: { habit_id: string; checked_today: boolean }[],
  today: string,
): Record<string, Set<string>> {
  const merged = { ...datesByHabit };
  for (const habit of habits) {
    if (habit.checked_today) {
      merged[habit.habit_id] = new Set(merged[habit.habit_id]).add(today);
    }
  }
  return merged;
}

export default function StatisticsPanel() {
  const { user } = useSession();
  const [filters, setFilters] = useState<Filters>({
    mode: "calendar",
    days: 30,
  });
  const [daysError, setDaysError] = useState<string>();
  const { data, status, error, fieldErrors, refetch } =
    useUserStatistics(filters);

  const habitIds = data?.habit_progress.map((habit) => habit.habit_id) ?? [];
  const {
    datesByHabit,
    categories,
    refetch: refetchHistory,
  } = useHabitsCheckIns(habitIds);

  // Check-ins e metas mudam em outras telas e a API não avisa: recarrega ao voltar
  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchHistory();
    }, [refetch, refetchHistory]),
  );

  const handleFiltersChange = (next: Filters) => {
    if (!isValidDays(next.days)) {
      setDaysError(`Escolha entre ${MIN_DAYS} e ${MAX_DAYS} dias.`);
      return;
    }
    setDaysError(undefined);
    setFilters(next);
  };

  const openCheckIn = (habitId: string) => {
    router.push({
      pathname: "/check-ins/create",
      params: { habitId, category: categories?.[habitId] ?? "" },
    } as Href);
  };

  const isEmpty = data?.habits.total === 0 && data.check_ins.total === 0;

  // O "hoje" vem também do `checked_today` das estatísticas: assim a bolinha
  // e a grade de hoje ficam certas mesmo se o histórico ainda estiver chegando
  const dates =
    data && datesByHabit
      ? withToday(datesByHabit, data.habit_progress, data.reference_date)
      : undefined;

  // Grade de 28 dias e bolinhas da semana, montadas a partir dos check-ins
  const histories =
    data && dates
      ? Object.fromEntries(
          habitIds.map((id) => [
            id,
            buildHabitHistory(dates[id] ?? new Set(), data.reference_date),
          ]),
        )
      : undefined;
  const week =
    data && dates
      ? buildWeekProgress(
          data.habit_progress.map((habit) => ({
            habit_id: habit.habit_id,
            starts_on: habit.goal.starts_on,
          })),
          dates,
          data.reference_date,
        )
      : undefined;

  return (
    <View>
      {status === "loading" && <StatisticsSkeleton />}
      {status === "error" && (
        <StatisticsError message={error ?? undefined} onRetry={refetch} />
      )}
      {status === "success" && data && isEmpty && <StatisticsEmpty />}
      {status === "success" && data && !isEmpty && (
        <StatisticsContent
          data={data}
          userName={user?.name}
          week={week}
          histories={histories}
          categories={categories}
          onCheckIn={openCheckIn}
          onSeeAllHabits={() => router.push("/habits" as Href)}
        />
      )}

      {/* No fim do painel: o cabeçalho escuro do protótipo fica no topo da tela */}
      <StatisticsFilters
        mode={filters.mode}
        days={filters.days}
        errors={{ mode: fieldErrors.mode, days: daysError ?? fieldErrors.days }}
        onChange={handleFiltersChange}
      />
    </View>
  );
}
