import { rankingScoreUnits } from "@/config/group-labels";
import type {
  Ranking,
  RankingCriterion,
  RankingItem,
} from "@/services/types/groups";
import { plural } from "@/utils/text";

// Posições, pontos e empates vêm prontos da API: aqui só se distribui a lista
// entre o pódio e a classificação e se monta o texto.

export interface PodiumSlots {
  left?: RankingItem;
  center?: RankingItem;
  right?: RankingItem;
}

/**
 * Os 3 primeiros da lista no pódio: o 1º no meio, o 2º à esquerda e o 3º à
 * direita. Com empate a posição é a da API (pode haver dois "1º").
 */
export function podiumSlots(items: RankingItem[]): PodiumSlots {
  return { center: items[0], left: items[1], right: items[2] };
}

/** Classificação abaixo do pódio: do 4º item em diante */
export function belowPodium(items: RankingItem[]): RankingItem[] {
  return items.slice(3);
}

/** Ninguém pontuou: lista vazia ou todo mundo com 0 */
export function nobodyScored(ranking: Pick<Ranking, "items">): boolean {
  return ranking.items.every((item) => item.score === 0);
}

/** `3` → `"3 dias"` ou `"3 metas"`, conforme o critério do grupo */
export function formatScore(
  score: number,
  criterion: RankingCriterion,
): string {
  const [singular, pluralForm] = rankingScoreUnits[criterion];
  return plural(score, singular, pluralForm);
}
