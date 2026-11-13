import type { HabitProgress } from "@/services/types/habits";

export type StatisticsMode = "calendar" | "rolling";

export interface StatisticsParams {
  mode?: StatisticsMode;
  days?: number;
}

export interface CheckInsSummary {
  total: number;
  today: number;
  week: number;
  month: number;
}

// `rate` vai de 0 a 100. Com `total_periods` 0 não há dados, não é 0%.
export interface CompletionRate {
  completed_periods: number;
  total_periods: number;
  rate: number;
}

export interface HabitStatisticsItem extends HabitProgress {
  name: string;
  checked_today: boolean;
  consistency: CompletionRate;
}

export interface SeriesPoint {
  date: string;
  count: number;
}

export interface UserStatistics {
  reference_date: string;
  timezone: string;
  mode: StatisticsMode;
  habits: { total: number; active: number; finished: number };
  check_ins: CheckInsSummary;
  completed_habits: { today: number; week: number; month: number };
  goal_completion: CompletionRate & { days: number };
  activity_streak: { current: number; best: number };
  at_risk: { count: number; habit_ids: string[] };
  habit_progress: HabitStatisticsItem[];
  series: { start: string; end: string; points: SeriesPoint[] };
}
