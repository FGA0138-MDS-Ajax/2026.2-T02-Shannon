import { Pressable, StyleSheet, Text, View } from "react-native";
import { currentPeriodPhrases, describeGoal } from "@/config/goal-labels";
import { habitCategoryLabels } from "@/config/habit-categories";
import { theme } from "@/config/theme";
import type { Habit, HabitProgress } from "@/services/types/habits";

export interface HabitCardProps {
  /** `progress` vem em GET /habits; os hábitos da tela do grupo não trazem */
  habit: Habit & { progress?: HabitProgress | null };
  onPress?: () => void;
  /** Dentro da tela do grupo o nome dele é redundante */
  hideGroupName?: boolean;
}

// Hábito de grupo mostra o grupo; o pessoal, se é público ou privado
function describeOwner(habit: Habit, hideGroupName: boolean): string | null {
  if (habit.group) return hideGroupName ? null : `Grupo ${habit.group.name}`;
  return habit.is_public ? "Público" : "Privado";
}

export default function HabitCard({
  habit,
  onPress,
  hideGroupName = false,
}: HabitCardProps) {
  const isFinished = habit.status === "finished";
  const isAtRisk = habit.progress?.status === "at_risk";
  const owner = describeOwner(habit, hideGroupName);

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
        {[habitCategoryLabels[habit.category], owner]
          .filter(Boolean)
          .join(" · ")}
      </Text>

      {habit.progress ? (
        <HabitProgressSummary progress={habit.progress} />
      ) : (
        <View style={styles.progressSection}>
          <Text style={habit.goal ? styles.goalSummary : styles.noGoal}>
            {habit.goal
              ? describeGoal(habit.goal)
              : // Hábito criado antes das metas: a API manda goal null
                "Sem meta · toque para definir"}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function HabitProgressSummary({ progress }: { progress: HabitProgress }) {
  const { done, target_count } = progress.current_period;
  const { period } = progress.goal;
  const isCompleted = progress.status === "completed";
  // `done` pode passar da meta; a barra para em 100%
  const ratio = target_count > 0 ? Math.min(done / target_count, 1) : 0;

  return (
    <View testID="habit-progress" style={styles.progressSection}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressCount}>
          {done}/{target_count} {currentPeriodPhrases[period]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  cardAtRisk: {
    borderColor: theme.colors.gray300,
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
    color: theme.colors.text,
  },
  badge: {
    backgroundColor: theme.colors.border,
    borderRadius: 9999,
    paddingVertical: 2,
    paddingHorizontal: 10,
  },
  badgeText: {
    fontFamily: theme.font.medium,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  details: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
  progressSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
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
    color: theme.colors.text,
  },
  goalRule: {
    flexShrink: 1,
    textAlign: "right",
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.colors.muted,
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
    backgroundColor: theme.colors.success,
  },
  goalSummary: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  noGoal: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    fontStyle: "italic",
    color: theme.colors.muted,
  },
});
