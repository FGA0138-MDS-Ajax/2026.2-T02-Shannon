import { Lucide } from "@react-native-vector-icons/lucide";
import { useFocusEffect } from "expo-router";
import { type ComponentProps, useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import useSWR from "swr";
import { Avatar, Card, ErrorBanner, Loading } from "@/components/ui";
import { formatStreak } from "@/config/goal-labels";
import {
  rankingCriterionLabels,
  rankingScoreUnits,
} from "@/config/group-labels";
import { theme } from "@/config/theme";
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

  useFocusEffect(
    useCallback(() => {
      refreshRanking();
      refreshStats();
    }, [refreshRanking, refreshStats]),
  );

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

type IconName = ComponentProps<typeof Lucide>["name"];

// Destaques do grupo, um por linha: rótulo, quem e em qual hábito
function GroupHighlights({ stats }: { stats: GroupStatistics }) {
  const { most_consistent: consistent, best_record: record } = stats;

  return (
    <Card testID="group-highlights" style={styles.listCard}>
      <HighlightRow
        testID="stat-check-ins-7-days"
        icon="calendar-check"
        label="Check-ins em 7 dias"
        value={String(stats.check_ins_last_7_days)}
        detail="Somando todos os integrantes"
      />
      <HighlightRow
        testID="stat-most-consistent"
        icon="flame"
        label="Mais constante"
        value={consistent ? `@${consistent.user.username}` : "—"}
        detail={
          consistent
            ? `${formatStreak(consistent.consistent_days, "day")} em ${consistent.habit.name}`
            : "Faça check-in para pontuar"
        }
      />
      <HighlightRow
        testID="stat-best-record"
        icon="trophy"
        label="Maior recorde"
        value={record ? `@${record.user.username}` : "—"}
        detail={
          record
            ? `${formatStreak(record.best_streak, record.unit)} em ${record.habit.name}`
            : "Nenhuma sequência registrada"
        }
        last
      />
    </Card>
  );
}

interface HighlightRowProps {
  icon: IconName;
  label: string;
  value: string;
  detail: string;
  last?: boolean;
  testID?: string;
}

function HighlightRow({
  icon,
  label,
  value,
  detail,
  last = false,
  testID,
}: HighlightRowProps) {
  return (
    <View testID={testID} style={[styles.row, last && styles.rowLast]}>
      <View style={styles.highlightIcon}>
        <Lucide name={icon} size={16} color={theme.colors.primaryDark} />
      </View>
      <View style={styles.highlightInfo}>
        <Text style={styles.highlightLabel}>{label}</Text>
        <Text style={styles.highlightDetail}>{detail}</Text>
      </View>
      <Text style={styles.highlightValue} numberOfLines={1}>
        {value}
      </Text>
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
  highlightIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  highlightInfo: {
    flex: 1,
    gap: 2,
  },
  highlightLabel: {
    fontFamily: theme.font.semiBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  highlightDetail: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  highlightValue: {
    maxWidth: "40%",
    fontFamily: theme.font.bold,
    fontSize: 15,
    color: theme.colors.text,
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
