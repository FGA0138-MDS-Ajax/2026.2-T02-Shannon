import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { theme } from "@/config/theme";
import { parseApiDate } from "@/utils/date";
import { type WeekDayProgress, weekDates } from "@/utils/habit-history";
import DayRing from "./day-ring";
import { palette } from "./palette";

const WEEKDAYS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
const MONTHS = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
];

const SIDE_PADDING = 22;
const DAY_GAP = 8;
const MAX_RING = 44;

export interface WeekHeaderProps {
  referenceDate: string;
  /** Progresso de segunda a domingo. Sem ele, os dias aparecem vazios. */
  week?: WeekDayProgress[];
  userName?: string;
}

export default function WeekHeader({
  referenceDate,
  week,
  userName,
}: WeekHeaderProps) {
  const { width } = useWindowDimensions();
  // Tamanho fixo e igual para as 7 bolinhas: com % elas saíam ovais
  const ringSize = Math.min(
    MAX_RING,
    Math.floor((width - SIDE_PADDING * 2 - DAY_GAP * 6) / 7),
  );
  const firstName = userName?.trim().split(" ")[0];
  const today = parseApiDate(referenceDate);
  const days =
    week ??
    weekDates(referenceDate).map((date) => ({ date, done: 0, total: 0 }));
  const dayOf = (date: string) => parseApiDate(date).getDate();
  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    <View style={styles.container}>
      <Text style={styles.greeting} accessibilityRole="header">
        {firstName ? `Olá, ${firstName}!` : "Olá!"}
      </Text>

      <View style={styles.week}>
        {days.map((day, index) => (
          <View key={day.date} style={[styles.day, { width: ringSize }]}>
            <Text
              style={[
                styles.weekday,
                day.date === referenceDate && styles.weekdayToday,
              ]}
            >
              {WEEKDAYS[index]}
            </Text>
            <DayRing
              day={dayOf(day.date)}
              done={day.done}
              total={day.total}
              size={ringSize}
              isToday={day.date === referenceDate}
              isFuture={day.date > referenceDate}
            />
          </View>
        ))}
      </View>

      <View style={styles.monthRow}>
        <Text style={styles.month}>
          {MONTHS[today.getMonth()]} {today.getFullYear()}
        </Text>
        <Text style={styles.range}>
          {pad(dayOf(days[0].date))} — {pad(dayOf(days[6].date))}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.ink,
    paddingHorizontal: SIDE_PADDING,
    paddingTop: 40,
    // Espaço para a folha clara subir por cima com cantos arredondados
    paddingBottom: 48,
  },
  greeting: {
    fontFamily: theme.font.regular,
    fontSize: 30,
    color: palette.cream,
    marginBottom: 20,
  },
  monthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  week: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  day: {
    alignItems: "center",
    gap: 9,
  },
  weekday: {
    fontFamily: theme.font.medium,
    fontSize: 9,
    color: palette.headerLabel,
  },
  weekdayToday: {
    color: palette.primary,
  },
  month: {
    fontFamily: theme.font.medium,
    fontSize: 9,
    color: palette.headerLabel,
  },
  range: {
    fontFamily: theme.font.medium,
    fontSize: 11,
    color: palette.cream,
  },
});
