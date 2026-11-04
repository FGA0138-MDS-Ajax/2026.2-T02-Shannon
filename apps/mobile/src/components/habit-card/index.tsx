import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  describeGoal,
  describeProgressStatus,
  formatStreak,
} from "@/config/goal-labels";
import { habitCategoryLabels } from "@/config/habit-categories";
import { theme } from "@/config/theme";
import type {
  GoalPeriod,
  HabitProgress,
  HabitWithProgress,
} from "@/services/types/habits";

export interface HabitCardProps {
  habit: HabitWithProgress;
  onPress?: () => void;
}

export default function HabitCard({ habit, onPress }: HabitCardProps) {
  const isFinished = habit.status === "finished";
  const isAtRisk = habit.progress?.status === "at_risk";

  return (
    <Pressable
      testID="habit-card"
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        isAtRisk && styles.cardAtRisk,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.titleRow}>
        <Text style={styles.name} numberOfLines={2}>
          {habit.name}
        </Text>
        {isFinished && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Encerrado</Text>
          </View>
        )}
      </View>
      <Text style={styles.details}>
        {habitCategoryLabels[habit.category]} ·{" "}
        {habit.is_public ? "Público" : "Privado"}
      </Text>

      {/* Hábito criado antes das metas: a API manda progress null */}
      {habit.progress ? (
        <HabitProgressSummary progress={habit.progress} />
      ) : (
        <View style={styles.progressSection}>
          <Text style={styles.noGoal}>Sem meta · toque para definir</Text>
        </View>
      )}
    </Pressable>
  );
}

const periodPhrases: Record<GoalPeriod, string> = {
  day: "hoje",
  week: "nesta semana",
  month: "neste mês",
};

function HabitProgressSummary({ progress }: { progress: HabitProgress }) {
  const { done, target_count } = progress.current_period;
  const { period } = progress.goal;
  const isAtRisk = progress.status === "at_risk";
  const isCompleted = progress.status === "completed";
  // `done` pode passar da meta; a barra para em 100%
  const ratio = target_count > 0 ? Math.min(done / target_count, 1) : 0;

  return (
    <View testID="habit-progress" style={styles.progressSection}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressCount}>
          {done}/{target_count} {periodPhrases[period]}
        </Text>
        <Text style={styles.goalRule}>{describeGoal(progress.goal)}</Text>
      </View>

      <View
        style={styles.progressTrack}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: target_count, now: done }}
      >
        <View
          style={[
            styles.progressFill,
            isCompleted && styles.progressFillCompleted,
            { width: `${ratio * 100}%` },
          ]}
        />
      </View>

      <Text style={styles.streak}>
        Streak: {formatStreak(progress.current_streak, period)} · Melhor:{" "}
        {formatStreak(progress.best_streak, period)}
      </Text>

      <Text
        testID="habit-progress-status"
        style={[
          styles.status,
          isAtRisk && styles.statusAtRisk,
          isCompleted && styles.statusCompleted,
        ]}
      >
        {isAtRisk ? "⚠ " : ""}
        {describeProgressStatus(progress)}
      </Text>
    </View>
  );
}

const colors = {
  text: "#1C1917",
  muted: "#6B6560",
  border: "#E7E2DE",
  success: "#2F7D4F",
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  cardAtRisk: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  cardPressed: {
    opacity: 0.8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontFamily: theme.font.semiBold,
    fontSize: 16,
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.border,
    borderRadius: 9999,
    paddingVertical: 2,
    paddingHorizontal: 10,
  },
  badgeText: {
    fontFamily: theme.font.medium,
    fontSize: 12,
    color: "#57534E",
  },
  details: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: colors.muted,
  },
  progressSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  progressCount: {
    fontFamily: theme.font.semiBold,
    fontSize: 14,
    color: colors.text,
  },
  goalRule: {
    flexShrink: 1,
    textAlign: "right",
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: colors.muted,
  },
  progressTrack: {
    height: 6,
    borderRadius: 9999,
    backgroundColor: theme.colors.gray100,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 9999,
    backgroundColor: theme.colors.primary,
  },
  progressFillCompleted: {
    backgroundColor: colors.success,
  },
  streak: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: colors.muted,
  },
  status: {
    fontFamily: theme.font.medium,
    fontSize: 13,
    color: colors.muted,
  },
  statusAtRisk: {
    color: theme.colors.primaryDark,
  },
  statusCompleted: {
    color: colors.success,
  },
  noGoal: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    fontStyle: "italic",
    color: colors.muted,
  },
});
