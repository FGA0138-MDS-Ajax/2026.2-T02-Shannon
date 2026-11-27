import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { request } from "@/services/api";
import { groupKeys } from "@/services/groups-api";
import type {
  GroupHabit,
  GroupHabitStatistics,
  GroupMember,
} from "@/services/types/groups";
import {
  type GroupPeriod,
  groupPeriod,
  type HabitPeriod,
  habitsPeriod,
  type MemberPeriod,
  membersPeriod,
} from "@/utils/group-period";

const NO_STATS: GroupHabitStatistics[] = [];
const NO_MEMBERS: GroupMember[] = [];

export interface GroupPeriodData {
  /** Integrantes com hábito, na ordem de entrada no grupo */
  members: MemberPeriod[];
  group: GroupPeriod;
  habits: HabitPeriod[];
}

/**
 * Hábitos ativos do grupo e a situação de cada integrante no período atual da
 * meta: a base da roda de participantes e da aba Hábitos. A API só tem as
 * estatísticas de um hábito por vez, então são uma chamada por hábito ativo.
 */
export function useGroupPeriod(
  groupId: string,
  groupMembers: GroupMember[] = NO_MEMBERS,
) {
  const habitsQuery = useSWR<GroupHabit[]>(
    groupKeys.habits(groupId, "active"),
    request,
  );
  const habits = habitsQuery.data;
  const habitIds = useMemo(
    () => (habits ?? []).map((habit) => habit.id),
    [habits],
  );

  const statsQuery = useSWR(
    habitIds.length > 0 ? groupKeys.allHabitsStats(groupId, habitIds) : null,
    () =>
      Promise.all(
        habitIds.map((habitId) =>
          request<GroupHabitStatistics>(groupKeys.habitStats(groupId, habitId)),
        ),
      ),
    { keepPreviousData: true },
  );
  // Sem hábito ativo não há chamada: a lista vazia já é a resposta
  const stats = habits && habitIds.length === 0 ? NO_STATS : statsQuery.data;

  const period = useMemo<GroupPeriodData | undefined>(() => {
    if (!stats) return undefined;
    const members = membersPeriod(stats, groupMembers);
    return {
      members,
      group: groupPeriod(members),
      habits: habitsPeriod(stats),
    };
  }, [stats, groupMembers]);

  const { mutate: refreshHabits } = habitsQuery;
  const { mutate: refreshStats } = statsQuery;
  const refresh = useCallback(
    () => Promise.all([refreshHabits(), refreshStats()]),
    [refreshHabits, refreshStats],
  );

  return {
    habits,
    period,
    error: habitsQuery.error ?? statsQuery.error,
    refresh,
  };
}

export type GroupPeriodState = ReturnType<typeof useGroupPeriod>;
