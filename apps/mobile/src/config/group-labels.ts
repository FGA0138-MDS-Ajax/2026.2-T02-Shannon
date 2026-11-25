import type { BadgeTone } from "@/components/ui";
import type {
  GroupRole,
  GroupStatus,
  RankingCriterion,
} from "@/services/types/groups";
import { formatDate, parseApiDate } from "@/utils/date";

// Textos de exibição dos grupos. Os números vêm sempre da API.

export const rankingCriterionLabels: Record<RankingCriterion, string> = {
  check_ins: "Check-ins",
  goals: "Metas cumpridas",
};

export const rankingCriterionHints: Record<RankingCriterion, string> = {
  check_ins: "Ganha quem fizer check-in em mais dias.",
  goals: "Ganha quem cumprir mais períodos de meta.",
};

// Unidade da pontuação no ranking: "12 dias", "3 metas"
export const rankingScoreUnits: Record<
  RankingCriterion,
  [singular: string, plural: string]
> = {
  check_ins: ["dia", "dias"],
  goals: ["meta", "metas"],
};

export const groupRoleLabels: Record<GroupRole, string> = {
  admin: "Admin",
  member: "Integrante",
};

export const groupStatusLabels: Record<GroupStatus, string> = {
  active: "Ativo",
  ended: "Encerrado",
};

export const groupStatusTones: Record<GroupStatus, BadgeTone> = {
  active: "primary",
  ended: "neutral",
};

/** `"K7P4M9X2"` → `"K7P4-M9X2"`, mais fácil de ler e ditar */
export function formatInviteCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/** Data de término do grupo: `"Termina em 11/12/2026"`, ou `null` sem prazo */
export function describeGroupPeriod(
  status: GroupStatus,
  endsOn: string | null,
): string | null {
  if (!endsOn) return null;
  const date = formatDate(parseApiDate(endsOn));
  return status === "ended" ? `Encerrado em ${date}` : `Termina em ${date}`;
}
