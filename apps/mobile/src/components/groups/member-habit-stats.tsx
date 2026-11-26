import { StyleSheet, Text, View } from "react-native";
import { Avatar, Card, ProgressBar } from "@/components/ui";
import { currentPeriodPhrases, formatStreak } from "@/config/goal-labels";
import { theme } from "@/config/theme";
import type { MemberHabitStats } from "@/services/types/groups";

export interface MemberHabitStatsListProps {
  members: MemberHabitStats[];
  currentUserId?: string;
  /** Cor de cada integrante no grupo (ver `memberColors`) */
  colorOf: (userId: string) => string;
}

// Progresso de cada integrante num hábito do grupo, já ordenado pela API
export default function MemberHabitStatsList({
  members,
  currentUserId,
  colorOf,
}: MemberHabitStatsListProps) {
  return (
    <Card style={styles.card}>
      {members.map((member, index) => (
        <MemberRow
          key={member.user.id}
          member={member}
          isMe={member.user.id === currentUserId}
          color={colorOf(member.user.id)}
          isLast={index === members.length - 1}
        />
      ))}
    </Card>
  );
}

interface MemberRowProps {
  member: MemberHabitStats;
  isMe: boolean;
  color: string;
  isLast: boolean;
}

function MemberRow({ member, isMe, color, isLast }: MemberRowProps) {
  const { progress, check_in_days: checkInDays } = member;
  const { done, target_count: target } = progress.current_period;
  const period = progress.goal.period;
  const isCompleted = done >= target;

  return (
    <View
      testID={`member-stats-${member.user.username}`}
      style={[styles.row, isLast && styles.rowLast]}
    >
      <Avatar
        name={member.user.username}
        color={color}
        size={32}
        highlighted={isMe}
      />
      <View style={styles.info}>
        <View style={styles.header}>
          <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
            {isMe ? "Você" : member.user.username}
          </Text>
          <Text style={styles.count}>
            {done}/{target} {currentPeriodPhrases[period]}
          </Text>
        </View>
        <ProgressBar
          ratio={target > 0 ? done / target : 0}
          tone={isCompleted ? "success" : "primary"}
        />
        <Text style={styles.meta}>
          Sequência de {formatStreak(progress.current_streak, period)} ·{" "}
          {checkInDays} {checkInDays === 1 ? "dia" : "dias"} com check-in
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  info: {
    flex: 1,
    gap: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
  },
  name: {
    flex: 1,
    fontFamily: theme.font.semiBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  nameMe: {
    fontFamily: theme.font.bold,
  },
  count: {
    fontFamily: theme.font.medium,
    fontSize: 13,
    color: theme.colors.text,
  },
  meta: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
});
