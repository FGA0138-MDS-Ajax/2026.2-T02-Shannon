import { formatStreak } from "@/config/goal-labels";
import type {
  GroupStatistics,
  RankingCriterion,
  RankingItem,
  RankingResponse,
} from "@/services/types/groups";
import { formatDate, parseApiDate } from "@/utils/date";

// Textos do ranking e das estatísticas do grupo. Posições, pontos e empates
// vêm prontos da API: aqui só se monta o texto, nada é recalculado.

export const criterionShortLabels: Record<RankingCriterion, string> = {
  check_ins: "por dias com check-in",
  goals: "por metas batidas",
};

/** `1` → `"1º"` */
export function ordinal(position: number): string {
  return `${position}º`;
}

/** `128` → `"128 pts"` */
export function pointsLabel(score: number): string {
  return `${score} pts`;
}

export interface PodiumSlots {
  left?: RankingItem;
  center?: RankingItem;
  right?: RankingItem;
}

/**
 * Os 3 primeiros da lista da API no pódio: o 1º item no meio, o 2º à esquerda
 * e o 3º à direita. A posição de cada um é a que a API mandar (com empate,
 * pode haver dois "1º" e nenhum "2º").
 */
export function podiumSlots(items: RankingItem[]): PodiumSlots {
  return { center: items[0], left: items[1], right: items[2] };
}

/** Classificação abaixo do pódio: do 4º item em diante */
export function belowPodium(items: RankingItem[]): RankingItem[] {
  return items.slice(3);
}

/** Ninguém pontuou: lista vazia ou todo mundo com 0 */
export function nobodyScored(ranking: Pick<RankingResponse, "items">): boolean {
  return ranking.items.every((item) => item.score === 0);
}

/** `"2026-12-31"` → `"Resultado final em 31/12/2026"` */
export function finalResultLabel(asOf: string): string {
  return `Resultado final em ${formatDate(parseApiDate(asOf))}`;
}

/** `"Ana em Ler 10 páginas, há 12 dias"` */
export function mostConsistentLabel(stats: GroupStatistics): string {
  const best = stats.most_consistent;
  if (!best) return "Sem sequência registrada ainda.";
  const days =
    best.consistent_days === 1 ? "1 dia" : `${best.consistent_days} dias`;
  return `${best.user.username} em ${best.habit.name}, há ${days}`;
}

/** `"Caio em Pedalar, 3 semanas"`, sempre com a unidade do recorde */
export function bestRecordLabel(stats: GroupStatistics): string {
  const record = stats.best_record;
  if (!record) return "Sem recorde registrado ainda.";
  return `${record.user.username} em ${record.habit.name}, ${formatStreak(record.best_streak, record.unit)}`;
}

/** `"23 check-ins nos últimos 7 dias"` */
export function lastWeekLabel(stats: GroupStatistics): string {
  const count = stats.check_ins_last_7_days;
  return `${count} ${count === 1 ? "check-in" : "check-ins"} nos últimos 7 dias`;
}
