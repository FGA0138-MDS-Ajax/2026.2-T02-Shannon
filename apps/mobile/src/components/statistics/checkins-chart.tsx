import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/config/theme";
import type { SeriesPoint } from "@/services/types/statistics";
import { formatDayMonth, plural } from "./format";
import { palette } from "./palette";

export interface CheckInsChartProps {
  points: SeriesPoint[];
  activeHabits: number;
  completedToday: number;
}

// "Seu ritmo": uma barra por dia da série, inclusive os dias sem check-in
export default function CheckInsChart({
  points,
  activeHabits,
  completedToday,
}: CheckInsChartProps) {
  // Cópia ordenada: a API já manda em ordem, mas a tela não depende disso
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  // Com muitos dias (até 365) as barras ficam finas: diminui o espaço entre elas
  const gap = sorted.length > 60 ? 1 : 3;

  return (
    <View testID="checkins-chart" style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>Seu ritmo</Text>
        <Text style={styles.muted}>
          {plural(activeHabits, "hábito ativo", "hábitos ativos")}
        </Text>
      </View>

      <View style={[styles.bars, { gap }]}>
        {sorted.map((point) => (
          <View
            key={point.date}
            testID={`checkins-bar-${point.date}`}
            accessibilityLabel={`${formatDayMonth(point.date)}: ${plural(point.count, "check-in", "check-ins")}`}
            style={[styles.bar, point.count > 0 && styles.barActive]}
          />
        ))}
      </View>

      <View style={styles.row}>
        <Text style={styles.small}>
          {plural(completedToday, "hábito concluído", "hábitos concluídos")}{" "}
          hoje
        </Text>
        <Text style={styles.small}>{plural(sorted.length, "dia", "dias")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 88,
    justifyContent: "space-between",
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontFamily: theme.font.medium,
    fontSize: 13,
    color: palette.ink,
  },
  muted: {
    fontFamily: theme.font.regular,
    fontSize: 10,
    color: palette.inkSoft,
  },
  bars: {
    flexDirection: "row",
    height: 18,
  },
  bar: {
    flex: 1,
    maxWidth: 8,
    borderRadius: 4,
    backgroundColor: palette.cell,
  },
  barActive: {
    backgroundColor: palette.primary,
  },
  small: {
    fontFamily: theme.font.regular,
    fontSize: 9,
    color: palette.inkSoft,
  },
});
