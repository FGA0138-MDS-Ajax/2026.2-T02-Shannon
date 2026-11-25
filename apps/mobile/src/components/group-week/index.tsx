import { StyleSheet, Text, View } from "react-native";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import {
  formatMonthYear,
  parseApiDate,
  toApiDate,
  weekDays,
} from "@/utils/date";

const WEEKDAYS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
// Laranja do Figma para o dia em que todo mundo bateu a meta
const COMPLETE = "#F16532";

export interface GroupWeekProps {
  // `YYYY-MM-DD` de hoje (o `as_of` das estatísticas)
  today: string;
  // Dias da semana em que todo o grupo concluiu os hábitos
  completeDays: string[];
}

/** Semana do grupo ("Navegação entre dias" no Figma). Só mostra, não tem toque. */
export default function GroupWeek({ today, completeDays }: GroupWeekProps) {
  const todayDate = parseApiDate(today);

  return (
    <View style={styles.container}>
      <Text style={styles.month}>{formatMonthYear(todayDate)}</Text>
      <View style={styles.days}>
        {weekDays(todayDate).map((date, index) => {
          const key = toApiDate(date);
          const isToday = key === today;
          const isComplete = !isToday && completeDays.includes(key);
          const label = isToday
            ? `Dia ${date.getDate()}, hoje`
            : isComplete
              ? `Dia ${date.getDate()}, meta coletiva completa`
              : `Dia ${date.getDate()}`;
          return (
            <View
              key={key}
              accessibilityLabel={label}
              style={[
                styles.day,
                isComplete && styles.complete,
                isToday && styles.today,
              ]}
            >
              <Text
                style={[
                  styles.weekday,
                  isComplete && styles.weekdayComplete,
                  isToday && styles.weekdayToday,
                ]}
              >
                {WEEKDAYS[index]}
              </Text>
              <Text style={[styles.number, isToday && styles.numberToday]}>
                {date.getDate()}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 7,
  },
  month: {
    alignSelf: "center",
    fontFamily: theme.font.medium,
    fontSize: 9,
    color: palette.inkSoft,
  },
  days: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  day: {
    width: 44,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  complete: {
    backgroundColor: COMPLETE,
  },
  today: {
    backgroundColor: palette.ink,
  },
  weekday: {
    fontFamily: theme.font.medium,
    fontSize: 8,
    color: palette.inkSoft,
  },
  weekdayComplete: {
    color: palette.ink,
  },
  weekdayToday: {
    color: palette.headerLabel,
  },
  number: {
    fontFamily: theme.font.medium,
    fontSize: 15,
    color: palette.ink,
  },
  numberToday: {
    color: palette.cream,
  },
});
