import { useCallback } from "react";
import useSWR from "swr";
import { request } from "@/services/api";
import { groupKeys } from "@/services/groups-api";
import type { GroupStatistics, Ranking } from "@/services/types/groups";

/**
 * Ranking e destaques do grupo. O pódio (no cabeçalho) e a classificação (na
 * folha) usam o mesmo hook; o SWR faz uma chamada só.
 */
export function useGroupRanking(groupId: string) {
  const ranking = useSWR<Ranking>(groupKeys.ranking(groupId), request);
  const stats = useSWR<GroupStatistics>(groupKeys.stats(groupId), request);

  const { mutate: refreshRanking } = ranking;
  const { mutate: refreshStats } = stats;
  const refresh = useCallback(() => {
    refreshRanking();
    refreshStats();
  }, [refreshRanking, refreshStats]);

  return {
    ranking: ranking.data,
    stats: stats.data,
    error: ranking.error ?? stats.error,
    refresh,
  };
}
