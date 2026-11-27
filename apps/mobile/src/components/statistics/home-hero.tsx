import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { theme } from "@/config/theme";
import {
  formatDayMonth,
  formatLongDate,
  MONTH_NAMES,
  parseApiDate,
} from "@/utils/date";
import { type WeekDayProgress, weekDates } from "@/utils/habit-history";
import DayRing from "./day-ring";
import { greeting } from "./format";

const WEEKDAYS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

const DAY_GAP = 8;
const MAX_RING = 44;

export interface HomeHeroProps {
  referenceDate: string;
  /** Progresso de segunda a domingo. Sem ele, os dias aparecem vazios. */
  week?: WeekDayProgress[];
  userName?: string;
}

// Cabeçalho escuro da Home: saudação, data e a semana com um anel por dia
export default function HomeHero({
  referenceDate,
  week,
  userName,
}: HomeHeroProps) {
  const { width } = useWindowDimensions();
  // Tamanho fixo e igual para os 7 anéis: com % eles saíam ovais
  const ringSize = Math.min(
    MAX_RING,
    Math.floor(
      (Math.min(width, theme.layout.content) -
        theme.spacing.screen * 2 -
        DAY_GAP * 6) /
        7,
    ),
  );
  const today = parseApiDate(referenceDate);
  const days =
    week ??
    weekDates(referenceDate).map((date) => ({ date, done: 0, total: 0 }));
  const doneDays = days.filter(
    (day) =>
      day.date <= referenceDate && day.total > 0 && day.done >= day.total,
  ).length;
  const first = days[0].date;
  const last = days[days.length - 1].date;

  return (
    <View testID="home-hero" style={styles.container}>
      <Text style={styles.greeting} accessibilityRole="header">
        {greeting(userName)}
      </Text>
      <Text style={styles.date}>{formatLongDate(today)}</Text>

      <View testID="week-card" style={styles.week}>
        {days.map((day, index) => {
          const isToday = day.date === referenceDate;
          return (
            <View key={day.date} style={[styles.day, { width: ringSize }]}>
              <Text style={[styles.weekday, isToday && styles.weekdayToday]}>
                {WEEKDAYS[index]}
              </Text>
              <DayRing
                day={parseApiDate(day.date).getDate()}
                done={day.done}
                total={day.total}
                size={ringSize}
                isToday={isToday}
                isFuture={day.date > referenceDate}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {MONTH_NAMES[today.getMonth()].toUpperCase()} {today.getFullYear()}
          {"  ·  "}
          {formatDayMonth(first)} — {formatDayMonth(last)}
        </Text>
        <Text style={styles.footerText}>{doneDays}/7 dias completos</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.screen,
    paddingTop: 20,
    paddingBottom: 28,
  },
  greeting: {
    fontFamily: theme.font.bold,
    fontSize: 30,
    color: theme.colors.onHero,
  },
  date: {
    marginTop: 4,
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.onHeroMuted,
  },
  week: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  day: {
    alignItems: "center",
    gap: 8,
  },
  weekday: {
    fontFamily: theme.font.medium,
    fontSize: 10,
    letterSpacing: 0.5,
    color: theme.colors.onHeroMuted,
  },
  weekdayToday: {
    color: theme.colors.primary,
  },
  footer: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  footerText: {
    fontFamily: theme.font.medium,
    fontSize: 11,
    letterSpacing: 0.5,
    color: theme.colors.onHeroMuted,
  },
});
