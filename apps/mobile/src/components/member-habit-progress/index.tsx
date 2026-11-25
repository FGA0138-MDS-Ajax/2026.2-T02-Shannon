import { Lucide } from "@react-native-vector-icons/lucide";
import { StyleSheet, Text, View } from "react-native";
import { periodPhrases, plural } from "@/components/statistics/format";
import { palette } from "@/components/statistics/palette";
import { describeProgressStatus, formatStreak } from "@/config/goal-labels";
import { theme } from "@/config/theme";
import type { MemberHabitStats } from "@/services/types/groups";

export interface MemberHabitProgressProps {
  stats: MemberHabitStats;
  isMe: boolean;
}

// Uma linha por integrante, com os números que a API calculou para ele
export default function MemberHabitProgress({
  stats,
  isMe,
}: MemberHabitProgressProps) {
  const { progress } = stats;
  const { done, target_count } = progress.current_period;
  const isAtRisk = progress.status === "at_risk";

  return (
    <View testID={`member-progress-${stats.user.id}`} style={styles.row}>
      <View style={styles.texts}>
        <Text style={styles.username}>
          {stats.user.username}
          {isMe && <Text style={styles.me}> (você)</Text>}
        </Text>
        <Text style={styles.detail}>
          {done} de {target_count} {periodPhrases[progress.goal.period]}
        </Text>
        <Text style={[styles.detail, isAtRisk && styles.atRisk]}>
          {describeProgressStatus(progress)}
        </Text>
      </View>

      <View style={styles.numbers}>
        <View style={styles.streak}>
          <Lucide name="flame" size={16} color={theme.colors.primary} />
          <Text style={styles.streakText}>
            {formatStreak(progress.current_streak, progress.goal.period)}
          </Text>
        </View>
        <Text style={styles.detail}>
          {plural(stats.check_in_days, "dia com check-in", "dias com check-in")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray300,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  username: {
    fontFamily: theme.font.semiBold,
    fontSize: 16,
    color: palette.ink,
  },
  me: {
    fontFamily: theme.font.regular,
    color: palette.inkSoft,
  },
  detail: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: palette.inkSoft,
  },
  atRisk: {
    color: palette.riskText,
  },
  numbers: {
    alignItems: "flex-end",
    gap: 4,
  },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakText: {
    fontFamily: theme.font.semiBold,
    fontSize: 14,
    color: palette.ink,
  },
});
