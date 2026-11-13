import type { HabitCategory } from "@/services/types/habits";
import type {
  HabitStatisticsItem,
  SeriesPoint,
  UserStatistics,
} from "@/services/types/statistics";
import type { HabitHistoryDay, WeekDayProgress } from "@/utils/habit-history";

// Dados falsos para desenvolver a tela, os testes e o Storybook sem a API.
// Formato copiado de uma resposta real de GET /user/statistics.

const REFERENCE_DATE = "2026-11-13";

// Pontos de `count` por dia, terminando em REFERENCE_DATE, em ordem crescente
function buildSeries(counts: number[]): SeriesPoint[] {
  const end = new Date(2026, 10, 13);
  return counts.map((count, index) => {
    const date = new Date(end);
    date.setDate(end.getDate() - (counts.length - 1 - index));
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return { date: `${date.getFullYear()}-${month}-${day}`, count };
  });
}

const thirtyDays = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 2, 0,
  1, 2, 1, 0,
];

function habit(
  overrides: Partial<HabitStatisticsItem> & { habit_id: string; name: string },
): HabitStatisticsItem {
  return {
    goal: {
      schedule_type: "frequency",
      period: "day",
      target_count: 1,
      period_end_weekday: null,
      starts_on: "2026-11-04",
    },
    current_period: {
      start: REFERENCE_DATE,
      end: REFERENCE_DATE,
      done: 0,
      target_count: 1,
    },
    status: "in_progress",
    current_streak: 0,
    best_streak: 0,
    streak_started_on: null,
    consistent_days: 0,
    checked_today: false,
    consistency: { completed_periods: 0, total_periods: 0, rate: 0 },
    ...overrides,
  };
}

const water = habit({
  habit_id: "habit-water",
  name: "Beber 2L de água",
  status: "completed",
  current_period: {
    start: REFERENCE_DATE,
    end: REFERENCE_DATE,
    done: 1,
    target_count: 1,
  },
  current_streak: 3,
  best_streak: 5,
  checked_today: true,
  consistency: { completed_periods: 6, total_periods: 9, rate: 66.7 },
});

const reading = habit({
  habit_id: "habit-reading",
  name: "Ler 10 páginas",
  goal: {
    schedule_type: "frequency",
    period: "week",
    target_count: 3,
    period_end_weekday: 7,
    starts_on: "2026-11-04",
  },
  current_period: {
    start: "2026-11-09",
    end: "2026-11-15",
    done: 1,
    target_count: 3,
  },
  current_streak: 1,
  best_streak: 1,
  consistency: { completed_periods: 1, total_periods: 1, rate: 100 },
});

const running = habit({
  habit_id: "habit-running",
  name: "Correr 5 km",
  status: "at_risk",
  goal: {
    schedule_type: "frequency",
    period: "week",
    target_count: 3,
    period_end_weekday: 7,
    starts_on: "2026-11-04",
  },
  current_period: {
    start: "2026-11-09",
    end: "2026-11-15",
    done: 0,
    target_count: 3,
  },
});

/** Cenário completo: vários hábitos, check-ins e nenhum em risco */
export const completeStatistics: UserStatistics = {
  reference_date: REFERENCE_DATE,
  timezone: "America/Sao_Paulo",
  mode: "calendar",
  habits: { total: 3, active: 3, finished: 0 },
  check_ins: { total: 9, today: 1, week: 4, month: 9 },
  completed_habits: { today: 1, week: 2, month: 5 },
  goal_completion: {
    completed_periods: 7,
    total_periods: 10,
    rate: 70,
    days: 30,
  },
  activity_streak: { current: 3, best: 5 },
  at_risk: { count: 0, habit_ids: [] },
  habit_progress: [water, reading, { ...running, status: "in_progress" }],
  series: {
    start: "2026-10-15",
    end: REFERENCE_DATE,
    points: buildSeries(thirtyDays),
  },
};

/** Cenário com hábitos em risco (igual à conta de teste local) */
export const atRiskStatistics: UserStatistics = {
  ...completeStatistics,
  check_ins: { total: 5, today: 0, week: 0, month: 5 },
  completed_habits: { today: 0, week: 0, month: 1 },
  goal_completion: {
    completed_periods: 2,
    total_periods: 18,
    rate: 11.1,
    days: 30,
  },
  activity_streak: { current: 0, best: 1 },
  at_risk: { count: 2, habit_ids: ["habit-water", "habit-running"] },
  habit_progress: [
    {
      ...water,
      status: "at_risk",
      checked_today: false,
      current_streak: 0,
      current_period: { ...water.current_period, done: 0 },
    },
    reading,
    running,
  ],
};

/** Cenário vazio: usuário novo, tudo zerado e série sem check-ins */
export const emptyStatistics: UserStatistics = {
  ...completeStatistics,
  habits: { total: 0, active: 0, finished: 0 },
  check_ins: { total: 0, today: 0, week: 0, month: 0 },
  completed_habits: { today: 0, week: 0, month: 0 },
  goal_completion: {
    completed_periods: 0,
    total_periods: 0,
    rate: 0,
    days: 30,
  },
  activity_streak: { current: 0, best: 0 },
  at_risk: { count: 0, habit_ids: [] },
  habit_progress: [],
  series: {
    start: "2026-10-15",
    end: REFERENCE_DATE,
    points: buildSeries(thirtyDays.map(() => 0)),
  },
};

/** Cenário sem períodos para medir: a taxa deve aparecer como "Sem dados ainda" */
export const noPeriodsStatistics: UserStatistics = {
  ...completeStatistics,
  goal_completion: {
    completed_periods: 0,
    total_periods: 0,
    rate: 0,
    days: 30,
  },
};

/** Categoria de cada hábito das fixtures (define o ícone do card) */
export const fixtureCategories: Record<string, HabitCategory> = {
  "habit-water": "alimentacao",
  "habit-reading": "leitura",
  "habit-running": "corrida",
};

/** Semana de 9 a 15/11 com hoje = 13: um dia completo, dois parciais, dois vazios e dois futuros */
export const fixtureWeek: WeekDayProgress[] = [
  { date: "2026-11-09", done: 2, total: 2 },
  { date: "2026-11-10", done: 1, total: 2 },
  { date: "2026-11-11", done: 2, total: 3 },
  { date: "2026-11-12", done: 0, total: 3 },
  { date: "2026-11-13", done: 1, total: 3 },
  { date: "2026-11-14", done: 0, total: 3 },
  { date: "2026-11-15", done: 0, total: 3 },
];

/** Histórico de 28 dias de um hábito, marcando os dias "X dias atrás" */
export function buildHistory(checkedDaysAgo: number[]): HabitHistoryDay[] {
  return buildSeries(Array.from({ length: 28 }, () => 0)).map(
    (point, index) => ({
      date: point.date,
      checked: checkedDaysAgo.includes(27 - index),
    }),
  );
}
