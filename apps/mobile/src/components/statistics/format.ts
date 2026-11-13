import type { GoalPeriod } from "@/services/types/habits";
import { formatDate, parseApiDate } from "@/utils/date";

// A API já manda a taxa arredondada (ex.: 11.1); só trocamos o ponto pela vírgula
export function formatPercent(rate: number): string {
  return `${String(rate).replace(".", ",")}%`;
}

// `"2026-10-26"` → `"26/10"`
export function formatDayMonth(value: string): string {
  return formatDate(parseApiDate(value)).slice(0, 5);
}

export function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export const periodPhrases: Record<GoalPeriod, string> = {
  day: "hoje",
  week: "nesta semana",
  month: "neste mês",
};

export const NO_DATA_LABEL = "Sem dados ainda";
