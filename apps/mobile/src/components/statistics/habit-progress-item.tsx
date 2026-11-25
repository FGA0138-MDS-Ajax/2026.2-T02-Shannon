import { Lucide } from "@react-native-vector-icons/lucide";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, Card } from "@/components/ui";
import { theme } from "@/config/theme";
import type { HabitCategory } from "@/services/types/habits";
import type { HabitStatisticsItem } from "@/services/types/statistics";
import type { HabitHistoryDay } from "@/utils/habit-history";
import { categoryIcons } from "./category-icons";
import { periodPhrases } from "./format";

export type { HabitHistoryDay };

export interface HabitProgressItemProps {
  habit: HabitStatisticsItem;
  /** Últimos 28 dias, do mais antigo ao de hoje. Enquanto não chega, a grade fica vazia. */
  history?: HabitHistoryDay[];
  category?: HabitCategory;
  /** Abre a tela de check-in com este hábito já marcado */
  onCheckIn?: () => void;
}

const HISTORY_DAYS = 28;

export default function HabitProgressItem({
  habit,
  history,
  category,
  onCheckIn,
}: HabitProgressItemProps) {
  const { done, target_count } = habit.current_period;
  // `ended` = hábito encerrado: não aceita mais check-in
  const isFinished = habit.status === "ended";
  const isDoneToday = habit.checked_today;

  return (
    <Card testID={`habit-progress-${habit.habit_id}`} style={styles.card}>
      <View style={styles.main}>
        <View style={styles.titleRow}>
          <View style={styles.icon}>
            <Lucide
              name={category ? categoryIcons[category] : "sparkles"}
              size={16}
              color={theme.colors.primaryDark}
            />
          </View>
          <Text style={styles.name} numberOfLines={2}>
            {habit.name}
          </Text>
        </View>

        <Text style={styles.progress}>
          {done} de {target_count} {periodPhrases[habit.goal.period]}
        </Text>

        <View style={styles.status}>
          {isFinished ? (
            <Badge label="Encerrado" />
          ) : isDoneToday ? (
            <View
              testID={`habit-done-${habit.habit_id}`}
              accessibilityLabel={`${habit.name}: feito hoje`}
              style={styles.done}
            >
              <Lucide
                name="circle-check"
                size={16}
                color={theme.colors.success}
              />
              <Text style={styles.doneText}>Feito hoje</Text>
            </View>
          ) : (
            <Pressable
              onPress={onCheckIn}
              disabled={!onCheckIn}
              accessibilityRole="button"
              accessibilityLabel={`Fazer check-in em ${habit.name}`}
              hitSlop={6}
              style={({ pressed }) => [
                styles.checkInButton,
                pressed && styles.pressed,
              ]}
            >
              <Lucide name="plus" size={14} color={theme.colors.surface} />
              <Text style={styles.checkInText}>Check-in</Text>
            </Pressable>
          )}
        </View>
      </View>

      <HistoryGrid history={history} checkedToday={habit.checked_today} />
    </Card>
  );
}

// 7 colunas × 4 linhas: o dia mais antigo no canto de cima e hoje no de baixo
function HistoryGrid({
  history,
  checkedToday,
}: {
  history?: HabitHistoryDay[];
  checkedToday: boolean;
}) {
  // Sem o histórico ainda, mostra a grade vazia (com o "hoje" que a API já informa)
  const cells =
    history ??
    Array.from({ length: HISTORY_DAYS }, (_, index) => ({
      date: `pending-${index}`,
      checked: index === HISTORY_DAYS - 1 && checkedToday,
    }));
  const todayIndex = cells.length - 1;

  return (
    <View style={styles.history}>
      <View style={styles.grid}>
        {cells.map((day, index) => (
          <View
            key={day.date}
            testID={`history-${day.date}${day.checked ? "-checked" : ""}`}
            style={[
              styles.cell,
              day.checked && styles.cellChecked,
              index === todayIndex && !day.checked && styles.cellToday,
            ]}
          />
        ))}
      </View>
      <Text style={styles.historyLabel}>últimos 28 dias</Text>
    </View>
  );
}

const CELL = 10;
const CELL_GAP = 4;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  main: {
    flex: 1,
    gap: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    flex: 1,
    fontFamily: theme.font.semiBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  progress: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  status: {
    alignItems: "flex-start",
    marginTop: "auto",
    paddingTop: 4,
  },
  checkInButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.primaryDark,
    borderRadius: theme.radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  pressed: {
    opacity: 0.8,
  },
  checkInText: {
    fontFamily: theme.font.medium,
    fontSize: 13,
    color: theme.colors.surface,
  },
  done: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
  },
  doneText: {
    fontFamily: theme.font.medium,
    fontSize: 13,
    color: theme.colors.success,
  },
  history: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  historyLabel: {
    fontFamily: theme.font.regular,
    fontSize: 10,
    color: theme.colors.muted,
  },
  grid: {
    width: CELL * 7 + CELL_GAP * 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CELL_GAP,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 3,
    backgroundColor: theme.colors.gray200,
  },
  cellChecked: {
    backgroundColor: theme.colors.primary,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
});
