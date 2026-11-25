import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui";
import { theme } from "@/config/theme";
import type { SeriesPoint } from "@/services/types/statistics";
import { formatDayMonth } from "@/utils/date";
import { plural } from "./format";

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
    <Card testID="checkins-chart" style={styles.card}>
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
        <Text style={styles.muted}>
          {plural(completedToday, "hábito concluído", "hábitos concluídos")}{" "}
          hoje
        </Text>
        <Text style={styles.muted}>{plural(sorted.length, "dia", "dias")}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontFamily: theme.font.semiBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  muted: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  bars: {
    flexDirection: "row",
    height: 24,
  },
  bar: {
    flex: 1,
    maxWidth: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.gray200,
  },
  barActive: {
    backgroundColor: theme.colors.primary,
  },
});
