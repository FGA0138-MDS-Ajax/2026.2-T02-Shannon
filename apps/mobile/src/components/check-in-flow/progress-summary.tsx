import { ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "@/components/button";
import { Card } from "@/components/ui";
import {
  currentPeriodPhrases,
  describeProgressStatus,
  formatStreak,
} from "@/config/goal-labels";
import { theme } from "@/config/theme";
import type { CheckInProgressItem } from "@/utils/check-in-progress";

export interface ProgressSummaryProps {
  items: CheckInProgressItem[];
  onViewCheckIn: () => void;
}

// Depois do envio: como ficou a meta de cada hábito com este check-in
export default function ProgressSummary({
  items,
  onViewCheckIn,
}: ProgressSummaryProps) {
  return (
    <>
      <ScrollView contentContainerStyle={styles.list}>
        {items.map(({ name, progress }) => {
          const { period } = progress.goal;
          const { done, target_count } = progress.current_period;
          return (
            <Card
              key={progress.habit_id}
              testID={`progress-${progress.habit_id}`}
              style={styles.card}
            >
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.detail}>
                {done} de {target_count} {currentPeriodPhrases[period]}
              </Text>
              <Text
                style={[
                  styles.detail,
                  progress.status === "at_risk" && styles.atRisk,
                ]}
              >
                {describeProgressStatus(progress)}
              </Text>
              <Text style={styles.detail}>
                Streak: {formatStreak(progress.current_streak, period)}
              </Text>
            </Card>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Button testID="view-check-in-button" onPress={onViewCheckIn}>
          Ver check-in
        </Button>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
    paddingVertical: 16,
  },
  card: {
    gap: 4,
  },
  name: {
    fontFamily: theme.font.semiBold,
    fontSize: 16,
    color: theme.colors.text,
  },
  detail: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
  atRisk: {
    fontFamily: theme.font.medium,
    color: theme.colors.warning,
  },
  footer: {
    alignItems: "flex-end",
    paddingVertical: 12,
  },
});
