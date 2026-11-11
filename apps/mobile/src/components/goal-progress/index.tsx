import { StyleSheet, Text, View } from "react-native";
import {
  describeGoal,
  describeProgressStatus,
  formatStreak,
} from "@/config/goal-labels";
import { theme } from "@/config/theme";
import type { HabitProgress, ProgressStatus } from "@/services/types/habits";
import { formatDate, parseApiDate } from "@/utils/date";

export interface GoalProgressProps {
  progress: HabitProgress;
}

// `"2026-10-26"` → `"26/10"`
function formatDayMonth(value: string): string {
  return formatDate(parseApiDate(value)).slice(0, 5);
}

const statusStyles: Record<
  ProgressStatus,
  { backgroundColor: string; color: string }
> = {
  completed: { backgroundColor: "#DCFCE7", color: "#15803D" },
  in_progress: { backgroundColor: "#F5F2EF", color: "#3D3835" },
  // Destaque: é o aviso mais útil para não perder o streak
  at_risk: { backgroundColor: "#FFEDD5", color: "#C2410C" },
  failed: { backgroundColor: "#FEE2E2", color: "#B91C1C" },
  ended: { backgroundColor: "#E7E2DE", color: "#57534E" },
};

// Só exibe o que a API calculou: nada de streak ou situação é calculado aqui
export default function GoalProgress({ progress }: GoalProgressProps) {
  const { goal, current_period: period } = progress;
  const statusColors = statusStyles[progress.status];
  const isDone = period.done >= period.target_count;
  // A barra para em 100%, mesmo quando `done` passa da meta
  const percent = Math.min(period.done / period.target_count, 1) * 100;

  const periodLabel =
    goal.period === "day"
      ? "Hoje"
      : `${goal.period === "week" ? "Semana" : "Mês"} de ${formatDayMonth(period.start)} a ${formatDayMonth(period.end)}`;

  return (
    <View testID="goal-progress" style={styles.container}>
      <Text style={styles.goal}>{describeGoal(goal)}</Text>
      <Text style={styles.period}>{periodLabel}</Text>

      <View style={styles.doneRow}>
        <Text style={styles.done}>
          {period.done} de {period.target_count}
        </Text>
        <View style={styles.track}>
          <View
          testID="goal-progress-fill"
            style={[
              styles.fill,
              {
                width: `${percent}%`,
                backgroundColor: isDone
                  ? statusStyles.completed.color
                  : theme.colors.primary,
              },
            ]}
          />
        </View>
      </View>

      <View
        style={[
          styles.status,
          { backgroundColor: statusColors.backgroundColor },
        ]}
      >
        <Text
          testID="goal-progress-status"
          style={[styles.statusText, { color: statusColors.color }]}
        >
          {describeProgressStatus(progress)}
        </Text>
      </View>

      <View style={styles.streakRow}>
        <Text style={styles.streak}>
          Streak: {formatStreak(progress.current_streak, goal.period)}
        </Text>
        <Text style={styles.best}>
          Recorde: {formatStreak(progress.best_streak, goal.period)}
        </Text>
      </View>

      {progress.streak_started_on && (
        <Text style={styles.consistency}>
          Constante desde {formatDayMonth(progress.streak_started_on)} (há{" "}
          {progress.consistent_days}{" "}
          {progress.consistent_days === 1 ? "dia" : "dias"})
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7E2DE",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  goal: {
    fontFamily: theme.font.semiBold,
    fontSize: 15,
    color: "#1C1917",
  },
  period: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: "#6B6560",
  },
  doneRow: {
    display: "flex",
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  done: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: "#1C1917",
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 9999,
    backgroundColor: "#E7E2DE",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 9999,
    backgroundColor: theme.colors.primary,
  },
  status: {
    borderRadius: 99999999,
    display: "flex",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  statusText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
  },
  streakRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  streak: {
    fontFamily: theme.font.semiBold,
    fontSize: 15,
    color: "#1C1917",
  },
  best: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: "#6B6560",
  },
  consistency: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: "#6B6560",
  },
});
