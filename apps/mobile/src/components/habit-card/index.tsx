import { Pressable, StyleSheet, Text, View } from "react-native";
import { habitCategoryLabels } from "@/config/habit-categories";
import { theme } from "@/config/theme";
import type { Habit } from "@/services/types/habits";

export interface HabitCardProps {
  habit: Habit;
  onPress?: () => void;
}

export default function HabitCard({ habit, onPress }: HabitCardProps) {
  const isFinished = habit.status === "finished";

  return (
    <Pressable
      testID="habit-card"
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7E2DE",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
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
    color: "#1C1917",
  },
  badge: {
    backgroundColor: "#E7E2DE",
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
    color: "#6B6560",
  },
});
