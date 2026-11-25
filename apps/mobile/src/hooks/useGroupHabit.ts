import useSWR from "swr";
import { getGroupHabit } from "@/services/groups-api";

/** Hábito do grupo. O hábito expandido e a edição usam a mesma chave. */
export function useGroupHabit(groupId: string, habitId: string) {
  return useSWR(`/groups/${groupId}/habits/${habitId}`, () =>
    getGroupHabit(groupId, habitId),
  );
}
