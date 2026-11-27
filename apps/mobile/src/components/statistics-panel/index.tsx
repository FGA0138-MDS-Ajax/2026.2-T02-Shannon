import { router } from "expo-router";
import { useState } from "react";
import QuickCheckInSheet, {
  type QuickCheckInHabit,
} from "@/components/quick-check-in";
import {
  StatisticsContent,
  StatisticsEmpty,
  StatisticsError,
  StatisticsFilters,
  StatisticsSkeleton,
} from "@/components/statistics";
import HomeHero from "@/components/statistics/home-hero";
import { HeroLayout } from "@/components/ui";
import { useHabitsCheckIns } from "@/hooks/useHabitsCheckIns";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { useSession } from "@/hooks/useSession";
import {
  isValidDays,
  MAX_DAYS,
  MIN_DAYS,
  useUserStatistics,
} from "@/hooks/useUserStatistics";
import type { StatisticsMode } from "@/services/types/statistics";
import { startOfToday, toApiDate } from "@/utils/date";
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
  // O "+" de um hábito abre o check-in rápido, sem sair da Home
  const [quickHabit, setQuickHabit] = useState<QuickCheckInHabit | null>(null);
  const { data, status, error, fieldErrors, refetch } =
    useUserStatistics(filters);

  const habitIds = data?.habit_progress.map((habit) => habit.habit_id) ?? [];
  const {
    datesByHabit,
    categories,
    refetch: refetchHistory,
  } = useHabitsCheckIns(habitIds);

  // Check-ins e metas mudam em outras telas e a API não avisa: recarrega ao voltar
  useRefreshOnFocus(refetch);
  useRefreshOnFocus(refetchHistory);

  const pull = usePullToRefresh(() =>
    Promise.all([refetch(), refetchHistory()]),
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
    const habit = data?.habit_progress.find((h) => h.habit_id === habitId);
    if (habit) setQuickHabit({ id: habit.habit_id, name: habit.name });
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
    <HeroLayout
      testID="statistics-panel"
      // Espaço para o botão flutuante "Novo check-in"
      bottomSpace={104}
      hero={
        <HomeHero
          // Enquanto as estatísticas chegam, a semana aparece vazia
          referenceDate={data?.reference_date ?? toApiDate(startOfToday())}
          week={week}
          userName={user?.name}
        />
      }
      refreshing={pull.refreshing}
      onRefresh={pull.onRefresh}
    >
      {status === "loading" && <StatisticsSkeleton />}
      {status === "error" && (
        <StatisticsError message={error ?? undefined} onRetry={refetch} />
      )}
      {status === "success" && data && isEmpty && <StatisticsEmpty />}
      {status === "success" && data && !isEmpty && (
        <StatisticsContent
          data={data}
          histories={histories}
          categories={categories}
          onCheckIn={openCheckIn}
          onSeeAllHabits={() => router.push("/habits")}
        />
      )}

      {/* No fim do painel: o resumo do dia é o que importa primeiro */}
      <StatisticsFilters
        mode={filters.mode}
        days={filters.days}
        errors={{ mode: fieldErrors.mode, days: daysError ?? fieldErrors.days }}
        onChange={handleFiltersChange}
      />

      <QuickCheckInSheet
        habit={quickHabit}
        userId={user?.id}
        onClose={() => setQuickHabit(null)}
      />
    </HeroLayout>
  );
}
