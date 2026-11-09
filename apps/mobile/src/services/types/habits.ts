// Espelho dos schemas da API de hábitos e check-ins (Swagger em /docs).
// Ids são UUID e datas chegam como texto: `YYYY-MM-DD` nos hábitos e
// ISO 8601 em UTC no `created_at` do check-in.

// Mesma ordem do back: `outros` por último.
export const HABIT_CATEGORIES = [
  "musculacao",
  "corrida",
  "ciclismo",
  "natacao",
  "cardio",
  "esportes",
  "alimentacao",
  "sono",
  "estudos",
  "leitura",
  "mente",
  "religiao",
  "produtividade",
  "financas",
  "arte",
  "outros",
] as const;

export type HabitCategory = (typeof HABIT_CATEGORIES)[number];

export type HabitStatus = "active" | "finished";

// Meta do hábito: quantas vezes fazer em cada período.
export type GoalPeriod = "day" | "week" | "month";

export type ScheduleType = "frequency";

// Situação do período atual, calculada pela API.
export type ProgressStatus =
  | "completed"
  | "in_progress"
  | "at_risk"
  | "failed"
  | "ended";

// Corpo da meta no POST /habits (campo `goal`) e no PUT /goals/habits/{id}/goal.
export interface GoalInput {
  period: GoalPeriod;
  // day: omita ou mande 1. week: 1 a 7. month: 1 a 28.
  target_count?: number | null;
  // Só na semanal, obrigatório: 1 = segunda ... 7 = domingo.
  period_end_weekday?: number | null;
}

export interface GoalPublic {
  schedule_type: ScheduleType;
  period: GoalPeriod;
  target_count: number;
  period_end_weekday: number | null;
  // `YYYY-MM-DD`: dia a partir do qual os check-ins contam.
  starts_on: string;
}

export interface PeriodProgress {
  start: string;
  end: string;
  // Dias distintos com check-in. Pode passar de target_count.
  done: number;
  target_count: number;
}

// Progresso calculado pela API a cada pedido; o app só exibe.
export interface HabitProgress {
  habit_id: string;
  goal: GoalPublic;
  current_period: PeriodProgress;
  status: ProgressStatus;
  current_streak: number;
  best_streak: number;
  streak_started_on: string | null;
  consistent_days: number;
}

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  category: HabitCategory;
  is_public: boolean;
  status: HabitStatus;
  author_user_id: string;
  created_at: string;
  target_end_date: string | null;
  finished_at: string | null;
  // `null` só em hábito criado antes das metas.
  goal: GoalPublic | null;
}

// Item de GET /habits. `progress` é `null` quando o hábito não tem meta.
export interface HabitWithProgress extends Habit {
  progress: HabitProgress | null;
}

export interface HabitCreate {
  name: string;
  category: HabitCategory;
  goal: GoalInput;
  description?: string | null;
  is_public?: boolean;
  target_end_date?: string | null;
}

// PATCH: só os campos enviados mudam. `null` apaga `description` e
// `target_end_date`; os outros campos não aceitam `null`.
export interface HabitUpdate {
  name?: string;
  category?: HabitCategory;
  is_public?: boolean;
  description?: string | null;
  target_end_date?: string | null;
}

export interface CheckIn {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  // ISO 8601, ex.: "PT1H30M". Ver utils/duration.
  duration: string | null;
  // A ordem não é garantida.
  habit_ids: string[];
}

export interface CheckInCreate {
  title: string;
  // De 1 a 20, sem repetidos.
  habit_ids: string[];
  description?: string | null;
  duration?: string | null;
}

// Resposta do POST /check-ins: um item de `progress` por hábito com meta,
// já contando este check-in. A ordem não é garantida: case pelo habit_id.
export interface CheckInCreated extends CheckIn {
  progress: HabitProgress[];
}

// Os hábitos vinculados não são editáveis.
export interface CheckInUpdate {
  title?: string;
  description?: string | null;
  duration?: string | null;
}

export interface CheckInCategory {
  name: HabitCategory;
  habit_count: number;
}

export interface CheckInCategoriesResponse {
  categories: CheckInCategory[];
}

export interface GroupSummary {
  id: string;
  name: string;
}

export interface HabitOption {
  id: string;
  name: string;
  category: HabitCategory;
  group: GroupSummary | null;
  preselected: boolean;
}

export interface HabitOptionsPage {
  items: HabitOption[];
  page: number;
  has_more: boolean;
}

// O back exige exatamente um dos dois filtros.
export type HabitOptionsParams = (
  | { category: HabitCategory; exclude_category?: never }
  | { exclude_category: HabitCategory; category?: never }
) & {
  page?: number;
  // De 1 a 20.
  page_size?: number;
};

// Corpo da recusa do POST /check-ins (404, 403 ou 409): nada foi gravado.
export interface CheckInRejection {
  detail: string;
  habit_ids: string[];
}

export interface CheckInsPage {
  items: Array<Record<string, CheckIn[]>>;
  page: number;
  has_more: boolean;
}

export interface ListCheckInsParams {
  [key: string]: string | number | undefined;
  page?: number;
  page_size?: number;
}
