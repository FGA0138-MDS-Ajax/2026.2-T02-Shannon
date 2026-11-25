// Espelho dos schemas da API de grupos (Swagger em /docs, contrato Sprint 5).
// Ids são UUID e datas chegam como texto: `YYYY-MM-DD` ou ISO 8601.

export type GroupStatus = "active" | "ended";
export type GroupRole = "admin" | "member";
export type RankingCriterion = "check_ins" | "goals";

// ── Grupo ────────────────────────────────────────────────────────────────────

export interface GroupSummary {
  id: string;
  name: string;
  status: GroupStatus;
  member_count: number;
  my_role: GroupRole;
}

export interface GroupDetail extends GroupSummary {
  description: string | null;
  starts_on: string;
  ends_on: string | null;
  ranking_criterion: RankingCriterion;
  invite_code: string | null;
  created_at: string;
}

export interface GroupCreate {
  name: string;
  description?: string | null;
  starts_on?: string;
  ends_on?: string | null;
  ranking_criterion?: RankingCriterion;
}

export interface GroupUpdate {
  name?: string;
  description?: string | null;
  ends_on?: string | null;
  ranking_criterion?: RankingCriterion;
}

// ── Membros ──────────────────────────────────────────────────────────────────

export interface GroupMember {
  user_id: string;
  username: string;
  name: string;
  role: GroupRole;
  joined_at: string;
}

export interface AddMemberRequest {
  username: string;
}

// ── Convite ──────────────────────────────────────────────────────────────────

export interface GroupInvitePreview {
  group_id: string;
  name: string;
  status: GroupStatus;
  member_count: number;
}

export interface JoinGroupRequest {
  code: string;
}

export interface JoinGroupResponse {
  group_id: string;
}

// ── Sair do grupo ────────────────────────────────────────────────────────────

export interface LeaveGroupResponse {
  group_deleted: boolean;
  promoted_user_id: string | null;
  promoted_username: string | null;
}

// ── Hábitos do grupo ─────────────────────────────────────────────────────────

import type { HabitCategory, GoalPublic } from "@/services/types/habits";

export type GroupHabitStatus = "active" | "ended";

export interface GroupHabit {
  id: string;
  name: string;
  description: string | null;
  category: HabitCategory;
  status: GroupHabitStatus;
  goal: GoalPublic | null;
  created_at: string;
  target_end_date: string | null;
  finished_at: string | null;
}

export interface GroupHabitCreate {
  name: string;
  category: HabitCategory;
  description?: string | null;
  target_end_date?: string | null;
  goal?: {
    period: "day" | "week" | "month";
    target_count?: number | null;
    period_end_weekday?: number | null;
  } | null;
}

export interface GroupHabitUpdate {
  name?: string;
  description?: string | null;
  category?: HabitCategory;
  target_end_date?: string | null;
}

// Estatísticas por integrante de um hábito do grupo
export interface GroupHabitMemberStats {
  user_id: string;
  username: string;
  name: string;
  check_in_days: number;
  current_streak: number;
  progress_done: number;
  progress_target: number;
}

export interface GroupHabitStats {
  habit_id: string;
  members: GroupHabitMemberStats[];
}

// ── Feed ─────────────────────────────────────────────────────────────────────

export interface GroupFeedItem {
  id: string;
  user_id: string;
  username: string;
  title: string;
  description: string | null;
  created_at: string;
  habit_names: string[];
}

export interface GroupFeedPage {
  items: GroupFeedItem[];
  next_cursor: string | null;
  has_more: boolean;
}

export type GroupFeedParams =
  | { before?: string; after?: never }
  | { after?: string; before?: never };

// ── Ranking ──────────────────────────────────────────────────────────────────

export interface RankingEntry {
  position: number;
  user_id: string;
  username: string;
  name: string;
  score: number;
  me: boolean;
}

export interface GroupRanking {
  entries: RankingEntry[];
  criterion: RankingCriterion;
  as_of: string | null;
  group_status: GroupStatus;
}

// ── Estatísticas do grupo ────────────────────────────────────────────────────

export type DurationUnit = "days" | "weeks" | "months";

export interface MostConsistentStat {
  username: string;
  habit_name: string;
  streak_days: number;
}

export interface BestRecordStat {
  username: string;
  habit_name: string;
  value: number;
  unit: DurationUnit;
}

export interface GroupStats {
  most_consistent: MostConsistentStat | null;
  best_record: BestRecordStat | null;
  check_ins_last_7_days: number;
}
