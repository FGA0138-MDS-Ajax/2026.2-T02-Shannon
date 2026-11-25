import type { GroupDetail, RankingCriterion } from "@/services/types/groups";
import { formatDate, parseApiDate } from "@/utils/date";

export const criterionLabels: Record<RankingCriterion, string> = {
  check_ins: "Ranking por dias com check-in",
  goals: "Ranking por metas batidas",
};

export function membersLabel(count: number): string {
  return count === 1 ? "1 membro" : `${count} membros`;
}

export function endsOnLabel({
  ends_on,
  status,
}: Pick<GroupDetail, "ends_on" | "status">): string {
  if (!ends_on) return "Sem data de fim";
  const end = formatDate(parseApiDate(ends_on));
  return status === "ended" ? `Terminou em ${end}` : `Termina em ${end}`;
}
