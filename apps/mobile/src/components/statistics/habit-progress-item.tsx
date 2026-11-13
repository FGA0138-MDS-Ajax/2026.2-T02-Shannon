import { Lucide } from "@react-native-vector-icons/lucide";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/config/theme";
import type { HabitCategory } from "@/services/types/habits";
import type { HabitStatisticsItem } from "@/services/types/statistics";
import type { HabitHistoryDay } from "@/utils/habit-history";
import { categoryIcons } from "./category-icons";
import { periodPhrases } from "./format";
import { palette } from "./palette";

export type { HabitHistoryDay };

export interface HabitProgressItemProps {
  habit: HabitStatisticsItem;
  /** Últimos 28 dias, do mais antigo ao de hoje. Enquanto não chega, a grade fica vazia. */
  history?: HabitHistoryDay[];
  category?: HabitCategory;
  /** Cor do quadradinho do ícone (o protótipo alterna laranja e verde) */
  tone?: "peach" | "sage";
  /** Abre a tela de check-in com este hábito já marcado */
  onCheckIn?: () => void;
}

const HISTORY_DAYS = 28;

export default function HabitProgressItem({
  habit,
  history,
  category,
  tone = "peach",
  onCheckIn,
}: HabitProgressItemProps) {
  const { done, target_count } = habit.current_period;
  // `ended` = hábito encerrado: não aceita mais check-in
  const isFinished = habit.status === "ended";
  const isDoneToday = habit.checked_today;
  // Borda laranja = ainda falta fazer hoje
  const isPending = !isFinished && !isDoneToday;

  return (
    <View
      testID={`habit-progress-${habit.habit_id}`}
      style={[styles.card, isPending && styles.cardPending]}
    >
      <View style={styles.main}>
        <View style={styles.titleRow}>
          <View style={[styles.icon, tone === "sage" && styles.iconSage]}>
            <Lucide
              name={category ? categoryIcons[category] : "sparkles"}
              size={18}
              color={palette.ink}
            />
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {habit.name}
          </Text>
        </View>

        <Text style={styles.progress}>
          {done} de {target_count} {periodPhrases[habit.goal.period]}
        </Text>

        {isFinished ? (
          <Text style={styles.finished}>Encerrado</Text>
        ) : isDoneToday ? (
          <View
            testID={`habit-done-${habit.habit_id}`}
            accessibilityLabel={`${habit.name}: feito hoje`}
            style={styles.checkInButton}
          >
            <View style={[styles.checkInCircle, styles.doneCircle]}>
              <Lucide name="check" size={20} color={palette.cream} />
            </View>
            <Text style={styles.checkInText}>Feito hoje</Text>
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
            <View style={styles.checkInCircle}>
              <Lucide name="plus" size={20} color={palette.cream} />
            </View>
            <Text style={styles.checkInText}>Check-in</Text>
          </Pressable>
        )}
      </View>

      <HistoryGrid history={history} checkedToday={habit.checked_today} />
    </View>
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
      <Text style={styles.historyLabel}>últimos 28 dias</Text>
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
    </View>
  );
}

const CELL = 11;
const CELL_GAP = 4;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 134,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.ink,
    borderRadius: 22,
    padding: 15,
  },
  cardPending: {
    borderColor: palette.primary,
    borderWidth: 2,
  },
  main: {
    flex: 1,
    justifyContent: "space-between",
    paddingRight: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: palette.riskBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSage: {
    backgroundColor: palette.sage,
  },
  name: {
    flex: 1,
    fontFamily: theme.font.medium,
    fontSize: 16,
    color: palette.ink,
  },
  progress: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: palette.inkSoft,
    marginTop: 10,
  },
  checkInButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 9,
    marginTop: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  doneCircle: {
    backgroundColor: palette.primary,
  },
  checkInCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  checkInText: {
    fontFamily: theme.font.medium,
    fontSize: 12,
    color: palette.ink,
  },
  finished: {
    fontFamily: theme.font.medium,
    fontSize: 12,
    color: palette.inkSoft,
    marginTop: 12,
  },
  // Rótulo + grade centralizados na altura do card
  history: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  historyLabel: {
    fontFamily: theme.font.regular,
    fontSize: 9,
    color: palette.inkSoft,
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
    backgroundColor: palette.cell,
  },
  cellChecked: {
    backgroundColor: palette.primary,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: palette.inkSoft,
  },
});
