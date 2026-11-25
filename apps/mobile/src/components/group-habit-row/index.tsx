import { Lucide } from "@react-native-vector-icons/lucide";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge } from "@/components/group-row";
import { categoryIcons } from "@/components/statistics/category-icons";
import { palette } from "@/components/statistics/palette";
import { describeGoal } from "@/config/goal-labels";
import { theme } from "@/config/theme";
import type { GroupHabit } from "@/services/types/groups";

export interface GroupHabitRowProps {
  habit: GroupHabit;
  onPress: () => void;
}

export default function GroupHabitRow({ habit, onPress }: GroupHabitRowProps) {
  const isFinished = habit.status === "finished";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        isFinished && styles.finished,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.icon}>
        <Lucide
          name={categoryIcons[habit.category]}
          size={18}
          color={theme.colors.primary}
        />
      </View>
      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={2}>
          {habit.name}
        </Text>
        <Text style={styles.goal}>{describeGoal(habit.goal)}</Text>
      </View>
      {isFinished && <Badge label="Encerrado" />}
      <Lucide name="chevron-right" size={20} color={palette.inkSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray300,
  },
  finished: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.6,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: theme.font.semiBold,
    fontSize: 16,
    color: palette.ink,
  },
  goal: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: palette.inkSoft,
  },
});
