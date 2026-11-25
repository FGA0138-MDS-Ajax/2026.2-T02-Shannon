import { useCallback, useMemo } from "react";
import useSWR from "swr";
import {
  getGroupFeed,
  getGroupHabitStats,
  getGroupRanking,
  getGroupStats,
  listGroupHabits,
} from "@/services/groups-api";

/**
 * Tudo o que a tela do grupo mostra além do detalhe: hábitos, progresso de
 * cada pessoa (roda), check-ins recentes, ranking e estatísticas.
 */
export function useGroupBoard(groupId: string) {
  // Mesma chave da tela de gerenciar hábitos: criar ou encerrar lá já
  // aparece aqui
  const habits = useSWR(`/groups/${groupId}/habits`, () =>
    listGroupHabits(groupId),
  );

  // Hábito encerrado não entra na meta de hoje
  const activeIds = useMemo(
    () =>
      (habits.data ?? [])
        .filter((habit) => habit.status === "active")
        .map((habit) => habit.id),
    [habits.data],
  );

  // A API só tem as estatísticas por hábito, então são uma chamada por hábito
  const habitStats = useSWR(
    activeIds.length > 0
      ? [`/groups/${groupId}/habits/stats`, ...activeIds]
      : null,
    () => Promise.all(activeIds.map((id) => getGroupHabitStats(groupId, id))),
  );

  // Por enquanto só a primeira página (a mais recente)
  const feed = useSWR(`/groups/${groupId}/check-ins`, () =>
    getGroupFeed(groupId),
  );
  const ranking = useSWR(`/groups/${groupId}/ranking`, () =>
    getGroupRanking(groupId),
  );
  const stats = useSWR(`/groups/${groupId}/stats`, () =>
    getGroupStats(groupId),
  );

  const { mutate: refreshHabits } = habits;
  const { mutate: refreshHabitStats } = habitStats;
  const { mutate: refreshFeed } = feed;
  const { mutate: refreshRanking } = ranking;
  const { mutate: refreshStats } = stats;
  const refresh = useCallback(() => {
    refreshHabits();
    refreshHabitStats();
    refreshFeed();
    refreshRanking();
    refreshStats();
  }, [
    refreshHabits,
    refreshHabitStats,
    refreshFeed,
    refreshRanking,
    refreshStats,
  ]);

  return {
    habits: habits.data,
    // Sem hábito ativo não há chamada: a lista vazia já é a resposta
    habitStats: activeIds.length === 0 && habits.data ? [] : habitStats.data,
    feed: feed.data,
    ranking: ranking.data,
    stats: stats.data,
    refresh,
  };
}
