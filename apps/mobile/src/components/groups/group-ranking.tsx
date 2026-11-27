import { StyleSheet } from "react-native";
import {
  EmptyState,
  ErrorBanner,
  FadeIn,
  Loading,
  Section,
} from "@/components/ui";
import { useGroupRanking } from "@/hooks/useGroupRanking";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { getErrorMessage } from "@/services/api-errors";
import type { GroupDetail } from "@/services/types/groups";
import { belowPodium, formatScore, nobodyScored } from "@/utils/group-ranking";
import GroupHighlights from "./group-highlights";
import RankingRow from "./ranking-row";

export interface GroupRankingProps {
  group: GroupDetail;
  colorOf: (userId: string) => string;
  userId?: string;
  /** Toque numa pessoa: mostra os hábitos dela na Visão geral */
  onOpenMember: (userId: string) => void;
}

/**
 * Folha da aba Ranking: a classificação abaixo do pódio (que fica no
 * cabeçalho), com a sua linha em destaque, e os destaques do grupo.
 */
export default function GroupRanking({
  group,
  colorOf,
  userId,
  onOpenMember,
}: GroupRankingProps) {
  const { ranking, stats, error, refresh } = useGroupRanking(group.id);
  useRefreshOnFocus(refresh);

  if (error && (!ranking || !stats)) {
    return <ErrorBanner message={getErrorMessage(error)} onRetry={refresh} />;
  }
  if (!ranking || !stats) {
    return <Loading testID="group-ranking-loading" />;
  }

  // Ninguém pontuou: o cabeçalho já diz isso; a folha fica sem repetir
  if (nobodyScored(ranking)) return null;
  const rest = belowPodium(ranking.items);

  return (
    <>
      <Section style={styles.first} title="Classificação">
        {rest.length === 0 ? (
          <EmptyState
            icon="trophy"
            title="Todos estão no pódio"
            message="Com mais integrantes, a classificação continua aqui."
          />
        ) : (
          rest.map((item, index) => (
            <FadeIn key={item.user.id} index={index}>
              <RankingRow
                testID={`ranking-row-${item.user.id}`}
                position={item.position}
                label={item.user.id === userId ? "Você" : item.user.username}
                username={item.user.username}
                score={formatScore(item.score, ranking.criterion)}
                color={colorOf(item.user.id)}
                isMe={item.user.id === userId}
                onPress={() => onOpenMember(item.user.id)}
              />
            </FadeIn>
          ))
        )}
      </Section>

      <Section title="Destaques">
        <GroupHighlights stats={stats} />
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  // A folha já tem margem em cima
  first: {
    marginTop: 0,
  },
});
