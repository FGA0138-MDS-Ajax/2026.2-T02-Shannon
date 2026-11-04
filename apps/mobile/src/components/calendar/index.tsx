import { Lucide } from "@react-native-vector-icons/lucide";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/config/theme";
import { toApiDate } from "@/utils/date";

export interface CalendarProps {
  year?: number;
  month?: number; // 1 a 12
  checkInDates?: Set<string> | string[];
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
  onMonthChange?: (year: number, month: number) => void;
  variant?: "dark" | "light";
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export default function Calendar({
  year,
  month,
  checkInDates,
  selectedDate,
  onSelectDate,
  onMonthChange,
  variant = "dark",
}: CalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toApiDate(today), [today]);

  const [currentYear, setCurrentYear] = useState<number>(
    year ?? today.getFullYear(),
  );
  const [currentMonth, setCurrentMonth] = useState<number>(
    month ?? today.getMonth() + 1,
  );

  useEffect(() => {
    if (year !== undefined) {
      setCurrentYear(year);
    }
  }, [year]);

  useEffect(() => {
    if (month !== undefined) {
      setCurrentMonth(month);
    }
  }, [month]);

  const checkInDatesSet = useMemo(() => {
    if (!checkInDates) return new Set<string>();
    if (checkInDates instanceof Set) return checkInDates;
    return new Set(checkInDates);
  }, [checkInDates]);

  const handlePrevMonth = () => {
    let nextYear = currentYear;
    let nextMonth = currentMonth - 1;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    setCurrentYear(nextYear);
    setCurrentMonth(nextMonth);
    onMonthChange?.(nextYear, nextMonth);
  };

  const handleNextMonth = () => {
    let nextYear = currentYear;
    let nextMonth = currentMonth + 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    setCurrentYear(nextYear);
    setCurrentMonth(nextMonth);
    onMonthChange?.(nextYear, nextMonth);
  };

  // Cálculos do grid do mês
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay();

  const isDark = variant === "dark";

  const monthLabel = `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`;

  const padNumber = (num: number) => String(num).padStart(2, "0");

  return (
    <View
      style={[
        styles.container,
        isDark ? styles.containerDark : styles.containerLight,
      ]}
      testID="calendar-container"
    >
      {/* Cabeçalho do mês e navegação */}
      <View style={styles.header}>
        <Text
          style={[
            styles.monthTitle,
            isDark ? styles.textDark : styles.textLight,
          ]}
          accessibilityRole="header"
        >
          {monthLabel}
        </Text>
        <View style={styles.navigation}>
          <Pressable
            testID="calendar-prev-month"
            accessibilityLabel="Mês anterior"
            onPress={handlePrevMonth}
            style={({ pressed }) => [
              styles.navButton,
              isDark ? styles.navButtonDark : styles.navButtonLight,
              pressed && styles.pressed,
            ]}
          >
            <Lucide
              name="chevron-left"
              size={18}
              color={isDark ? "#FFFFFF" : "#1C1917"}
            />
          </Pressable>
          <Pressable
            testID="calendar-next-month"
            accessibilityLabel="Próximo mês"
            onPress={handleNextMonth}
            style={({ pressed }) => [
              styles.navButton,
              isDark ? styles.navButtonDark : styles.navButtonLight,
              pressed && styles.pressed,
            ]}
          >
            <Lucide
              name="chevron-right"
              size={18}
              color={isDark ? "#FFFFFF" : "#1C1917"}
            />
          </Pressable>
        </View>
      </View>

      {/* Dias da semana */}
      <View style={styles.weekdaysRow}>
        {WEEKDAYS.map((day) => (
          <View key={day} style={styles.weekdayCol}>
            <Text
              style={[
                styles.weekdayText,
                isDark ? styles.weekdayTextDark : styles.weekdayTextLight,
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Grid de dias */}
      <View style={styles.daysGrid}>
        {/* Espaços em branco antes do 1º dia */}
        {WEEKDAYS.slice(0, firstDayOfWeek).map((wd) => (
          <View key={`empty-${wd}`} style={styles.dayCellContainer} />
        ))}

        {/* Dias do mês */}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const dayNum = index + 1;
          const dateStr = `${currentYear}-${padNumber(currentMonth)}-${padNumber(dayNum)}`;
          const hasCheckIn = checkInDatesSet.has(dateStr);
          const isSelected = selectedDate === dateStr;
          const isToday = todayStr === dateStr;

          return (
            <View key={dateStr} style={styles.dayCellContainer}>
              <Pressable
                testID={`calendar-day-${dateStr}`}
                accessibilityLabel={`Dia ${dayNum}${hasCheckIn ? ", check-in realizado" : ""}`}
                onPress={() => onSelectDate?.(dateStr)}
                style={({ pressed }) => [
                  styles.dayCell,
                  isDark ? styles.dayCellDark : styles.dayCellLight,
                  hasCheckIn &&
                    (isDark
                      ? styles.dayCellCheckInDark
                      : styles.dayCellCheckInLight),
                  isToday &&
                    (isDark
                      ? styles.dayCellTodayDark
                      : styles.dayCellTodayLight),
                  isSelected && styles.dayCellSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isDark ? styles.dayTextDark : styles.dayTextLight,
                    hasCheckIn && styles.dayTextCheckIn,
                    isSelected && styles.dayTextSelected,
                  ]}
                >
                  {dayNum}
                </Text>

                {/* Ponto laranja indicando check-in */}
                {hasCheckIn && (
                  <View
                    testID={`check-in-dot-${dateStr}`}
                    style={styles.orangeDot}
                  />
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
    width: "100%",
  },
  containerDark: {
    backgroundColor: "#121214",
    borderWidth: 1,
    borderColor: "#27272A",
  },
  containerLight: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7E2DE",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  monthTitle: {
    fontFamily: theme.font.bold,
    fontSize: 20,
    letterSpacing: -0.2,
  },
  textDark: {
    color: "#FFFFFF",
  },
  textLight: {
    color: "#1C1917",
  },
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonDark: {
    backgroundColor: "#27272A",
  },
  navButtonLight: {
    backgroundColor: theme.colors.gray100,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  weekdaysRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  weekdayText: {
    fontFamily: theme.font.semiBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  weekdayTextDark: {
    color: "#A1A1AA",
  },
  weekdayTextLight: {
    color: "#78716C",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  dayCellContainer: {
    width: "14.2857%", // 100% / 7 colunas
    paddingHorizontal: 2.5,
  },
  dayCell: {
    aspectRatio: 0.9,
    minHeight: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dayCellDark: {
    backgroundColor: "transparent",
  },
  dayCellLight: {
    backgroundColor: "transparent",
  },
  dayCellCheckInDark: {
    backgroundColor: "#222226",
    borderWidth: 1,
    borderColor: "#3F3F46",
  },
  dayCellCheckInLight: {
    backgroundColor: "#F5F3F0",
    borderWidth: 1,
    borderColor: "#E7E2DE",
  },
  dayCellTodayDark: {
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  dayCellTodayLight: {
    borderWidth: 1.5,
    borderColor: "#1C1917",
  },
  dayCellSelected: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  dayText: {
    fontFamily: theme.font.medium,
    fontSize: 15,
  },
  dayTextDark: {
    color: "#A1A1AA",
  },
  dayTextLight: {
    color: "#78716C",
  },
  dayTextCheckIn: {
    color: "#FFFFFF",
    fontFamily: theme.font.bold,
  },
  dayTextSelected: {
    color: theme.colors.primary,
    fontFamily: theme.font.bold,
  },
  orangeDot: {
    position: "absolute",
    bottom: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
});
