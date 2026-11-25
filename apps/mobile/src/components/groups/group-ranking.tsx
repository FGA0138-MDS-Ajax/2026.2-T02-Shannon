import { StyleSheet, Text, View } from "react-native";
import useSWR from "swr";
import { Avatar, Card, ErrorBanner, Loading } from "@/components/ui";
import {
  rankingCriterionLabels,
  rankingScoreUnits,
} from "@/config/group-labels";
import { theme } from "@/config/theme";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { useSession } from "@/hooks/useSession";
import { request } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import { groupKeys } from "@/services/groups-api";
import type {
  GroupStatistics,
  Ranking,
  RankingCriterion,
  RankingItem,
} from "@/services/types/groups";
import { formatDate, parseApiDate } from "@/utils/date";
import GroupHighlights from "./group-highlights";

function formatScore(score: number, criterion: RankingCriterion): string {
  const [singular, plural] = rankingScoreUnits[criterion];
  return `${score} ${score === 1 ? singular : plural}`;
}

export default function GroupRanking({ groupId }: { groupId: string }) {
  const { user } = useSession();
  const ranking = useSWR<Ranking>(groupKeys.ranking(groupId), request);
  const stats = useSWR<GroupStatistics>(groupKeys.stats(groupId), request);
  const { mutate: refreshRanking } = ranking;
  const { mutate: refreshStats } = stats;

  useRefreshOnFocus(refreshRanking);
  useRefreshOnFocus(refreshStats);

  const error = ranking.error ?? stats.error;
  if (error && (!ranking.data || !stats.data)) {
    return (
      <ErrorBanner
        message={getErrorMessage(error)}
        onRetry={() => {
          refreshRanking();
          refreshStats();
        }}
      />
    );
  }
  if (!ranking.data || !stats.data) {
    return <Loading testID="group-ranking-loading" />;
  }

  const { criterion, as_of, items, me } = ranking.data;

  return (
    <View style={styles.container}>
      <GroupHighlights stats={stats.data} />

      <Card testID="ranking-card" style={styles.listCard}>
        <View style={styles.rankingHeader}>
          <Text style={styles.rankingTitle}>
            Ranking por {rankingCriterionLabels[criterion].toLowerCase()}
          </Text>
          <Text style={styles.asOf}>
            até {formatDate(parseApiDate(as_of)).slice(0, 5)}
          </Text>
        </View>
        <Text style={styles.me} testID="ranking-me">
          {items.every((item) => item.score === 0)
            ? "Ninguém pontuou ainda"
            : `Você está em ${me.position}º com ${formatScore(me.score, criterion)}`}
        </Text>

        {items.map((item, index) => (
          <RankingRow
            key={item.user.id}
            item={item}
            criterion={criterion}
            isMe={item.user.id === user?.id}
            isLast={index === items.length - 1}
          />
        ))}
      </Card>
    </View>
  );
}

interface RankingRowProps {
  item: RankingItem;
  criterion: RankingCriterion;
  isMe: boolean;
  isLast: boolean;
}

function RankingRow({ item, criterion, isMe, isLast }: RankingRowProps) {
  const isPodium = item.position <= 3;
  return (
    <View
      testID={`ranking-row-${item.user.id}`}
      style={[styles.row, isLast && styles.rowLast]}
    >
      <Text style={[styles.position, isPodium && styles.positionPodium]}>
        {item.position}º
      </Text>
      <Avatar name={item.user.username} size={32} highlighted={isMe} />
      <Text
        style={[styles.username, isMe && styles.usernameMe]}
        numberOfLines={1}
      >
        {isMe ? "Você" : `@${item.user.username}`}
      </Text>
      <Text style={styles.score}>{formatScore(item.score, criterion)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  listCard: {
    paddingBottom: 4,
  },
  rankingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
  },
  rankingTitle: {
    flex: 1,
    fontFamily: theme.font.semiBold,
    fontSize: 16,
    color: theme.colors.text,
  },
  asOf: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  me: {
    marginTop: 4,
    marginBottom: 8,
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.colors.primaryDark,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  position: {
    width: 28,
    fontFamily: theme.font.semiBold,
    fontSize: 14,
    color: theme.colors.muted,
  },
  positionPodium: {
    color: theme.colors.primaryDark,
  },
  username: {
    flex: 1,
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.text,
  },
  usernameMe: {
    fontFamily: theme.font.bold,
  },
  score: {
    fontFamily: theme.font.semiBold,
    fontSize: 14,
    color: theme.colors.text,
  },
});
