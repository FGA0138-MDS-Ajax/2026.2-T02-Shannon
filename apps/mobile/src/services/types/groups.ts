// Espelho dos schemas da API de grupos (Swagger em /docs, rotas /groups).
// Datas sem horário chegam como `YYYY-MM-DD`; `joined_at` e `created_at`
// chegam em ISO 8601 UTC.

import type {
  CheckInPhotoPublic,
  GoalPeriod,
  Habit,
  HabitCreate,
  HabitProgress,
  HabitStatus,
  HabitUpdate,
} from "@/services/types/habits";

export type GroupRole = "admin" | "member";

// `check_ins`: dias com check-in. `goals`: períodos de meta cumpridos.
export type RankingCriterion = "check_ins" | "goals";

// O grupo encerra no dia seguinte ao `ends_on`.
export type GroupStatus = "active" | "ended";

// Limite de integrantes por grupo aceito pela API
export const GROUP_MAX_MEMBERS = 30;

export interface GroupMember {
  user_id: string;
  username: string;
  role: GroupRole;
  joined_at: string;
}

// Item de GET /groups
export interface GroupListItem {
  id: string;
  name: string;
  members_count: number;
  my_role: GroupRole;
  status: GroupStatus;
  ends_on: string | null;
  ranking_criterion: RankingCriterion;
}

export interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  starts_on: string;
  ends_on: string | null;
  ranking_criterion: RankingCriterion;
  status: GroupStatus;
  members_count: number;
  my_role: GroupRole;
  // Só vem para administradores; `null` para os demais.
  invite_code: string | null;
  members: GroupMember[];
}

export interface GroupCreate {
  name: string;
  ranking_criterion: RankingCriterion;
  description?: string | null;
  ends_on?: string | null;
}

// PATCH: só os campos enviados mudam. `ends_on: null` reabre o grupo.
export interface GroupUpdate {
  name?: string;
  description?: string | null;
  ends_on?: string | null;
  ranking_criterion?: RankingCriterion;
}

// Resumo de GET /groups/invite/{code}, antes de entrar.
export interface GroupPreview {
  id: string;
  name: string;
  members_count: number;
  status: GroupStatus;
}

export interface InviteCode {
  invite_code: string;
}

export interface LeaveResult {
  group_deleted: boolean;
  promoted_user_id: string | null;
}

// Hábito de grupo: `author_user_id` nulo e `group` sempre preenchido.
// A meta é obrigatória e não muda depois; `is_public` é sempre `false`.
export type GroupHabit = Habit & { group: { id: string; name: string } };

export type GroupHabitCreate = Omit<HabitCreate, "is_public">;

export type GroupHabitUpdate = Omit<HabitUpdate, "is_public">;

// Feed ------------------------------------------------------------------------
export interface FeedItem {
  // Opaco: o app só guarda e devolve em `before`/`after`.
  cursor: string;
  id: string;
  author: { id: string; username: string };
  title: string;
  description: string | null;
  // Só os hábitos do grupo, nunca os pessoais.
  habits: { id: string; name: string }[];
  created_at: string;
  // No feed só vem `thumbnail_url`; `url` é sempre `null`.
  photo?: CheckInPhotoPublic | null;
}

export interface FeedPage {
  items: FeedItem[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface FeedParams {
  [key: string]: string | number | undefined;
  limit?: number;
  before?: string;
  after?: string;
}

// Ranking ---------------------------------------------------------------------
export interface RankingUser {
  id: string;
  username: string;
}

export interface RankingItem {
  // Empatados dividem a posição (1, 1, 3).
  position: number;
  user: RankingUser;
  score: number;
}

export interface Ranking {
  criterion: RankingCriterion;
  // Até onde foi calculado: hoje ou o `ends_on` do grupo encerrado.
  as_of: string;
  items: RankingItem[];
  me: { position: number; score: number };
}

// Estatísticas ----------------------------------------------------------------
export interface MemberHabitStats {
  user: RankingUser;
  progress: HabitProgress;
  check_in_days: number;
}

export interface GroupHabitStatistics {
  as_of: string;
  habit_id: string;
  name: string;
  habit_status: HabitStatus;
  // Ordenado pelo maior `current_streak`. Vazio em hábito sem meta.
  members: MemberHabitStats[];
}

export interface GroupStatistics {
  as_of: string;
  // `null` quando ninguém pontuou.
  most_consistent: {
    user: RankingUser;
    habit: { id: string; name: string };
    consistent_days: number;
  } | null;
  best_record: {
    user: RankingUser;
    habit: { id: string; name: string };
    best_streak: number;
    unit: GoalPeriod;
  } | null;
  check_ins_last_7_days: number;
}
