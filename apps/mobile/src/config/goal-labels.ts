import type {
  GoalPeriod,
  GoalPublic,
  HabitProgress,
  ProgressStatus,
} from "@/services/types/habits";

// Textos de exibição de metas e progresso. Os números vêm sempre da API:
// aqui só se monta o texto, nunca se calcula streak ou situação.

export const goalPeriodLabels: Record<GoalPeriod, string> = {
  day: "Diária",
  week: "Semanal",
  month: "Mensal",
};

// Mesma numeração da API: 1 = segunda ... 7 = domingo
export const weekdayLabels: Record<number, string> = {
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
  7: "Domingo",
};

const weekdayClosings: Record<number, string> = {
  1: "fecha na segunda",
  2: "fecha na terça",
  3: "fecha na quarta",
  4: "fecha na quinta",
  5: "fecha na sexta",
  6: "fecha no sábado",
  7: "fecha no domingo",
};

type GoalRule = Pick<GoalPublic, "period" | "target_count"> & {
  period_end_weekday?: number | null;
};

/** `{ period: "week", target_count: 4, period_end_weekday: 7 }` → `"4x por semana, fecha no domingo"` */
export function describeGoal(goal: GoalRule): string {
  if (goal.period === "day") return "Todo dia";
  if (goal.period === "month") return `${goal.target_count}x por mês`;

  const closing = goal.period_end_weekday
    ? weekdayClosings[goal.period_end_weekday]
    : undefined;
  const perWeek = `${goal.target_count}x por semana`;
  return closing ? `${perWeek}, ${closing}` : perWeek;
}

const streakUnits: Record<GoalPeriod, [singular: string, plural: string]> = {
  day: ["dia", "dias"],
  week: ["semana", "semanas"],
  month: ["mês", "meses"],
};

/** Streak na unidade da meta: `(1, "day")` → `"1 dia"`, `(2, "week")` → `"2 semanas"` */
export function formatStreak(count: number, period: GoalPeriod): string {
  const [singular, plural] = streakUnits[period];
  return `${count} ${count === 1 ? singular : plural}`;
}

const progressStatusLabels: Record<
  Exclude<ProgressStatus, "in_progress">,
  string
> = {
  completed: "Meta do período cumprida",
  at_risk: "Não pode faltar nenhum dia",
  failed: "Este período não fecha mais; recomece no próximo",
  ended: "Streak final",
};

/** Texto da situação do período atual, ex.: `"Faltam 2"` ou `"Não pode faltar nenhum dia"` */
export function describeProgressStatus(progress: HabitProgress): string {
  if (progress.status !== "in_progress") {
    return progressStatusLabels[progress.status];
  }

  const missing =
    progress.current_period.target_count - progress.current_period.done;
  return missing === 1 ? "Falta 1" : `Faltam ${missing}`;
}
