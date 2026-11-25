import { Lucide } from "@react-native-vector-icons/lucide";
import { StyleSheet, Text, View } from "react-native";
import PressableScale from "@/components/pressable-scale";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";

export interface MemberHabitCardProps {
  name: string;
  description: string | null;
  done: boolean;
  onPress: () => void;
}

/** Hábito do grupo na lista de uma pessoa: feito hoje ou ainda a fazer */
export default function MemberHabitCard({
  name,
  description,
  done,
  onPress,
}: MemberHabitCardProps) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={[styles.status, done ? styles.done : styles.todo]}>
          <Lucide
            name={done ? "check" : "minus"}
            size={16}
            color={palette.ink}
          />
        </View>
        <View style={styles.texts}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.state, done && styles.stateDone]}>
            {done ? "Concluído hoje" : "A fazer hoje"}
          </Text>
        </View>
      </View>
      {description && (
        <Text style={styles.description} numberOfLines={1}>
          {description}
        </Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: palette.card,
    borderWidth: 0.7,
    borderColor: palette.inkSoft,
    borderRadius: 22,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  status: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  done: {
    backgroundColor: palette.sageSoft,
  },
  todo: {
    backgroundColor: "#EAE9E0",
  },
  texts: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontFamily: theme.font.medium,
    fontSize: 16,
    color: palette.ink,
  },
  state: {
    fontFamily: theme.font.medium,
    fontSize: 11,
    color: palette.inkSoft,
  },
  stateDone: {
    color: palette.sageInk,
  },
  description: {
    fontFamily: theme.font.regular,
    fontSize: 11,
    color: palette.inkSoft,
  },
});
