import type { CheckIn } from "@/services/types/habits";
import { parseApiDate, toApiDate } from "@/utils/date";

/** Um dia da grade de um hábito. */
export interface HabitHistoryDay {
  date: string;
  checked: boolean;
}

/** Um dia da faixa da semana: quantos hábitos tiveram check-in e quantos existiam. */
export interface WeekDayProgress {
  date: string;
  done: number;
  total: number;
}

/** Datas locais (`YYYY-MM-DD`) em que o hábito teve check-in. */
export function checkInDates(checkIns: CheckIn[]): Set<string> {
  // `created_at` vem em UTC: converte para o dia do aparelho, senão um
  // check-in às 22h no Brasil cairia no dia seguinte
  return new Set(checkIns.map((item) => toApiDate(new Date(item.created_at))));
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next;
}

/** Os `length` dias que terminam em `referenceDate`, do mais antigo para hoje. */
export function buildHabitHistory(
  dates: Set<string>,
  referenceDate: string,
  length = 28,
): HabitHistoryDay[] {
  const today = parseApiDate(referenceDate);
  return Array.from({ length }, (_, index) => {
    const date = toApiDate(addDays(today, index - (length - 1)));
    return { date, checked: dates.has(date) };
  });
}

/** Segunda a domingo da semana de `referenceDate`. */
export function weekDates(referenceDate: string): string[] {
  const today = parseApiDate(referenceDate);
  // getDay(): domingo = 0; aqui a semana começa na segunda
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) =>
    toApiDate(addDays(monday, index)),
  );
}

/**
 * Para cada dia da semana: hábitos com check-in no dia (`done`) e hábitos que
 * já tinham começado (`total`). O dia fica completo quando `done === total`.
 */
export function buildWeekProgress(
  habits: { habit_id: string; starts_on: string }[],
  datesByHabit: Record<string, Set<string>>,
  referenceDate: string,
): WeekDayProgress[] {
  return weekDates(referenceDate).map((date) => {
    const started = habits.filter((habit) => habit.starts_on <= date);
    const done = started.filter((habit) =>
      datesByHabit[habit.habit_id]?.has(date),
    ).length;
    return { date, done, total: started.length };
  });
}
