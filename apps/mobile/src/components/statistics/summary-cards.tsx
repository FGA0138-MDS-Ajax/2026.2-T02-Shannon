import { Lucide } from "@react-native-vector-icons/lucide";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/config/theme";
import type { UserStatistics } from "@/services/types/statistics";
import { formatPercent, NO_DATA_LABEL, plural } from "./format";
import { palette } from "./palette";

// Cartões da "Visão geral". Só exibem números calculados pela API.

export function CheckInsCard({ data }: { data: UserStatistics }) {
  const { month, week } = data.check_ins;
  // `mode` muda o que é "semana" e "mês": calendário ou últimos 7/30 dias
  const isCalendar = data.mode === "calendar";

  return (
    <View
      testID="summary-check-ins"
      style={[styles.highlight, styles.checkIns]}
    >
      <Text style={styles.label}>
        {isCalendar ? "Check-ins no mês" : "Check-ins em 30 dias"}
      </Text>
      <View style={styles.valueRow}>
        <Text style={styles.bigValue}>{month}</Text>
        <Lucide name="circle-check" size={24} color={palette.ink} />
      </View>
      <Text style={styles.footer}>
        {week} {isCalendar ? "nesta semana" : "em 7 dias"}
      </Text>
    </View>
  );
}

export function GoalCompletionCard({ data }: { data: UserStatistics }) {
  const { rate, completed_periods, total_periods } = data.goal_completion;
  // Sem períodos não há o que medir: "0%" daria a ideia errada de fracasso
  const hasData = total_periods > 0;

  return (
    <View testID="summary-goals" style={[styles.highlight, styles.goals]}>
      <Text style={styles.label}>Metas cumpridas</Text>
      <Text style={hasData ? styles.rateValue : styles.noDataValue}>
        {hasData ? formatPercent(rate) : NO_DATA_LABEL}
      </Text>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: hasData ? rate : 0 }}
      >
        <View
          style={[
            styles.fill,
            { width: `${hasData ? Math.min(rate, 100) : 0}%` },
          ]}
        />
      </View>
      <Text style={styles.footer}>
        {completed_periods} de {plural(total_periods, "período", "períodos")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  highlight: {
    flex: 1,
    height: 122,
    borderWidth: 1,
    borderColor: palette.ink,
    borderRadius: 22,
    padding: 14,
    justifyContent: "space-between",
  },
  checkIns: {
    backgroundColor: palette.primary,
  },
  goals: {
    backgroundColor: palette.sage,
  },
  label: {
    fontFamily: theme.font.medium,
    fontSize: 11,
    color: palette.ink,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bigValue: {
    fontFamily: theme.font.medium,
    fontSize: 40,
    color: palette.ink,
  },
  rateValue: {
    fontFamily: theme.font.medium,
    fontSize: 32,
    color: palette.ink,
  },
  noDataValue: {
    fontFamily: theme.font.medium,
    fontSize: 16,
    color: palette.ink,
  },
  footer: {
    fontFamily: theme.font.regular,
    fontSize: 10,
    color: palette.ink,
  },
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: palette.sageTrack,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: palette.ink,
  },
});
