import { Lucide } from "@react-native-vector-icons/lucide";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/config/theme";
import { MONTH_NAMES, toApiDate } from "@/utils/date";

export type CalendarVariant = "dark" | "light";

export interface CalendarProps {
  year?: number;
  month?: number; // 1 a 12
  checkInDates?: Set<string> | string[];
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
  onMonthChange?: (year: number, month: number) => void;
  variant?: CalendarVariant;
}

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

// O tema escuro é o destaque da aba de check-ins; o claro segue os cards.
// Os tons escuros (zinc) só existem aqui, por isso não estão no theme.
const palettes: Record<
  CalendarVariant,
  {
    background: string;
    border: string;
    title: string;
    navBackground: string;
    weekday: string;
    day: string;
    checkInBackground: string;
    checkInBorder: string;
    today: string;
  }
> = {
  dark: {
    background: "#121214",
    border: "#27272A",
    title: theme.colors.surface,
    navBackground: "#27272A",
    weekday: "#A1A1AA",
    day: "#A1A1AA",
    checkInBackground: "#222226",
    checkInBorder: "#3F3F46",
    today: theme.colors.surface,
  },
  light: {
    background: theme.colors.surface,
    border: theme.colors.border,
    title: theme.colors.text,
    navBackground: theme.colors.gray100,
    weekday: theme.colors.muted,
    day: theme.colors.muted,
    checkInBackground: theme.colors.gray100,
    checkInBorder: theme.colors.border,
    today: theme.colors.text,
  },
};

/** Soma `delta` meses: `(2026, 12, 1)` → `[2027, 1]` */
function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1);
  return [date.getFullYear(), date.getMonth() + 1] as const;
}

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
  const todayStr = toApiDate(today);
  const colors = palettes[variant];

  const [currentYear, setCurrentYear] = useState(year ?? today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(
    month ?? today.getMonth() + 1,
  );

  // Componente semicontrolado: segue `year`/`month` quando o pai os muda
  useEffect(() => {
    if (year !== undefined) setCurrentYear(year);
  }, [year]);

  useEffect(() => {
    if (month !== undefined) setCurrentMonth(month);
  }, [month]);

  const checkInDatesSet = useMemo(
    () => new Set<string>(checkInDates ?? []),
    [checkInDates],
  );

  const goToMonth = (delta: number) => {
    const [nextYear, nextMonth] = shiftMonth(currentYear, currentMonth, delta);
    setCurrentYear(nextYear);
    setCurrentMonth(nextMonth);
    onMonthChange?.(nextYear, nextMonth);
  };

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
      testID="calendar-container"
    >
      <View style={styles.header}>
        <Text
          style={[styles.monthTitle, { color: colors.title }]}
          accessibilityRole="header"
        >
          {MONTH_NAMES[currentMonth - 1]} {currentYear}
        </Text>
        <View style={styles.navigation}>
          <NavButton
            testID="calendar-prev-month"
            label="Mês anterior"
            icon="chevron-left"
            color={colors.title}
            background={colors.navBackground}
            onPress={() => goToMonth(-1)}
          />
          <NavButton
            testID="calendar-next-month"
            label="Próximo mês"
            icon="chevron-right"
            color={colors.title}
            background={colors.navBackground}
            onPress={() => goToMonth(1)}
          />
        </View>
      </View>

      <View style={styles.weekdaysRow}>
        {WEEKDAYS.map((day) => (
          <Text
            key={day}
            style={[styles.weekdayText, { color: colors.weekday }]}
          >
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {/* Espaços em branco antes do dia 1 */}
        {WEEKDAYS.slice(0, firstDayOfWeek).map((weekday) => (
          <View key={`empty-${weekday}`} style={styles.dayCellContainer} />
        ))}

        {Array.from({ length: daysInMonth }, (_, index) => {
          const dayNum = index + 1;
          const dateStr = toApiDate(
            new Date(currentYear, currentMonth - 1, dayNum),
          );
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
                  hasCheckIn && {
                    backgroundColor: colors.checkInBackground,
                    borderWidth: 1,
                    borderColor: colors.checkInBorder,
                  },
                  isToday && { borderWidth: 1.5, borderColor: colors.today },
                  isSelected && styles.dayCellSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: colors.day },
                    hasCheckIn && [styles.dayTextBold, { color: colors.title }],
                    isSelected && styles.dayTextSelected,
                  ]}
                >
                  {dayNum}
                </Text>
                {hasCheckIn && (
                  <View
                    testID={`check-in-dot-${dateStr}`}
                    style={styles.checkInDot}
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

interface NavButtonProps {
  testID: string;
  label: string;
  icon: "chevron-left" | "chevron-right";
  color: string;
  background: string;
  onPress: () => void;
}

function NavButton({
  testID,
  label,
  icon,
  color,
  background,
  onPress,
}: NavButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.navButton,
        { backgroundColor: background },
        pressed && styles.pressed,
      ]}
    >
      <Lucide name={icon} size={18} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
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
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  weekdaysRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    fontFamily: theme.font.semiBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  dayCellContainer: {
    width: `${100 / 7}%`,
    paddingHorizontal: 2.5,
  },
  dayCell: {
    aspectRatio: 0.9,
    minHeight: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellSelected: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  dayText: {
    fontFamily: theme.font.medium,
    fontSize: 15,
  },
  dayTextBold: {
    fontFamily: theme.font.bold,
  },
  dayTextSelected: {
    color: theme.colors.primary,
    fontFamily: theme.font.bold,
  },
  checkInDot: {
    position: "absolute",
    bottom: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
});
