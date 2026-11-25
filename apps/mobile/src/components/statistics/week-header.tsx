import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Card, ScreenHeader } from "@/components/ui";
import { theme } from "@/config/theme";
import { formatLongDate, parseApiDate } from "@/utils/date";
import { type WeekDayProgress, weekDates } from "@/utils/habit-history";
import DayRing from "./day-ring";
import { greeting } from "./format";

const WEEKDAYS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

// Margem da tela + padding do card, dos dois lados
const HORIZONTAL_SPACE = (theme.spacing.screen + 16) * 2;
const DAY_GAP = 6;
const MAX_RING = 40;

export interface WeekHeaderProps {
  referenceDate: string;
  /** Progresso de segunda a domingo. Sem ele, os dias aparecem vazios. */
  week?: WeekDayProgress[];
  userName?: string;
}

// Saudação com a data de hoje e a semana atual, um anel por dia
export default function WeekHeader({
  referenceDate,
  week,
  userName,
}: WeekHeaderProps) {
  const { width } = useWindowDimensions();
  // Tamanho fixo e igual para os 7 anéis: com % eles saíam ovais
  const ringSize = Math.min(
    MAX_RING,
    Math.floor((Math.min(width, 640) - HORIZONTAL_SPACE - DAY_GAP * 6) / 7),
  );
  const today = parseApiDate(referenceDate);
  const days =
    week ??
    weekDates(referenceDate).map((date) => ({ date, done: 0, total: 0 }));
  const dayOf = (date: string) => parseApiDate(date).getDate();
  const doneDays = days.filter(
    (day) =>
      day.date <= referenceDate && day.total > 0 && day.done >= day.total,
  ).length;

  return (
    <View>
      <ScreenHeader
        title={greeting(userName)}
        subtitle={formatLongDate(today)}
      />

      <Card testID="week-card" style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Sua semana</Text>
          <Text style={styles.cardMeta}>{doneDays}/7 dias completos</Text>
        </View>

        <View style={styles.week}>
          {days.map((day, index) => {
            const isToday = day.date === referenceDate;
            return (
              <View key={day.date} style={[styles.day, { width: ringSize }]}>
                <Text style={[styles.weekday, isToday && styles.weekdayToday]}>
                  {WEEKDAYS[index]}
                </Text>
                <DayRing
                  day={dayOf(day.date)}
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
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  cardTitle: {
    fontFamily: theme.font.semiBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  cardMeta: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  week: {
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
    color: theme.colors.muted,
  },
  weekdayToday: {
    color: theme.colors.primaryDark,
  },
});
