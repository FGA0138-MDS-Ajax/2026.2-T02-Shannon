import { request, toQueryString } from "@/services/api";
import { habitKeys } from "@/services/habits-api";
import type {
  StatisticsMode,
  StatisticsParams,
  UserStatistics,
} from "@/services/types/statistics";

/**
 * Chaves do SWR do painel da Home. São listas porque juntam vários
 * parâmetros (filtros, ids dos hábitos) numa chave só.
 */
const USER_STATISTICS = "/user/statistics";
const HABITS_CHECK_INS = "/habits/check-ins";

export const statisticsKeys = {
  user: (mode: StatisticsMode, days: number) =>
    [USER_STATISTICS, mode, days] as const,
  // Histórico de check-ins de vários hábitos, buscado de uma vez
  habitsCheckIns: (habitIds: string[]) =>
    [HABITS_CHECK_INS, ...habitIds] as const,
};

/**
 * Chaves com dados da Home. Depois de um check-in, recarregue-as com
 * `mutate(isHomeDataKey)` para o painel atualizar na hora.
 */
export function isHomeDataKey(key: unknown): boolean {
  if (key === habitKeys.list()) return true;
  return (
    Array.isArray(key) &&
    (key[0] === USER_STATISTICS || key[0] === HABITS_CHECK_INS)
  );
}

export function getUserStatistics({
  mode,
  days,
}: StatisticsParams = {}): Promise<UserStatistics> {
  return request<UserStatistics>(
    `${USER_STATISTICS}${toQueryString({ mode, days })}`,
  );
}
