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
}

export interface HabitCreate {
  name: string;
  category: HabitCategory;
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
