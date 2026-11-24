// Espelho dos schemas da API de grupos (Sprint 5). Quem não é membro recebe
// 404 em qualquer rota do grupo, como se o grupo não existisse.
import type {
  GoalInput,
  GoalPeriod,
  GoalPublic,
  GroupSummary,
  HabitCategory,
  HabitProgress,
  HabitStatus,
} from "@/services/types/habits";

export type { GroupSummary } from "@/services/types/habits";

export type GroupRole = "admin" | "member";

// Critério do ranking: dias com check-in ou metas batidas.
export type RankingCriterion = "check_ins" | "goals";

// "ended" depois do `ends_on`. Estender o fim reabre o grupo.
export type GroupStatus = "active" | "ended";

export interface UserRef {
  id: string;
  username: string;
}

export interface HabitRef {
  id: string;
  name: string;
}

export interface MemberPublic {
  user_id: string;
  username: string;
  role: GroupRole;
  joined_at: string;
}

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
  // Só admin recebe o código; para membro vem `null`.
  invite_code: string | null;
  members: MemberPublic[];
}

export interface GroupCreate {
  name: string;
  ranking_criterion: RankingCriterion;
  description?: string | null;
  // Sem `starts_on` o grupo começa hoje.
  starts_on?: string | null;
  ends_on?: string | null;
}

// PATCH: campo ausente não muda; `null` apaga `description` e `ends_on`.
export interface GroupUpdate {
  name?: string;
  description?: string | null;
  ends_on?: string | null;
  ranking_criterion?: RankingCriterion;
}

export interface GroupPreview {
  id: string;
  name: string;
  members_count: number;
  status: GroupStatus;
}

export interface InviteCodePublic {
  invite_code: string;
}

// Resposta do POST /groups/{id}/leave (200 com corpo, não 204).
export interface LeaveResult {
  group_deleted: boolean;
  promoted_user_id: string | null;
}

// Sem `is_public`: hábito de grupo nunca é público.
export interface GroupHabitCreate {
  name: string;
  category: HabitCategory;
  goal: GoalInput;
  description?: string | null;
  target_end_date?: string | null;
}

// Sem `goal`: a meta de hábito de grupo não muda depois de criada.
export interface GroupHabitUpdate {
  name?: string;
  category?: HabitCategory;
  description?: string | null;
  target_end_date?: string | null;
}

export interface GroupHabit {
  id: string;
  name: string;
  description: string | null;
  category: HabitCategory;
  is_public: false;
  status: HabitStatus;
  author_user_id: null;
  author_group_id: string;
  created_at: string;
  target_end_date: string | null;
  finished_at: string | null;
  goal: GoalPublic;
  group: GroupSummary;
}

// Cursor opaco do feed: só guardar e devolver para a API.
export type FeedCursor = string & { readonly __feedCursor: unique symbol };

export interface FeedItem {
  cursor: FeedCursor;
  id: string;
  author: UserRef;
  title: string;
  description: string | null;
  // Só os hábitos deste grupo, mesmo que o check-in tenha outros.
  habits: HabitRef[];
  created_at: string;
}

export interface FeedPage {
  items: FeedItem[];
  // Para `before` na próxima página. Sempre `null` quando a chamada usou `after`.
  next_cursor: FeedCursor | null;
  // Sem `after`: há itens mais antigos. Com `after`: há mais novos, chame de novo.
  has_more: boolean;
}

// `before` e `after` nunca juntos.
export type FeedParams =
  | { limit?: number; before?: FeedCursor; after?: never }
  | { limit?: number; after?: FeedCursor; before?: never };

export interface RankingItem {
  // Empate repete a posição: 1, 1, 3.
  position: number;
  user: UserRef;
  score: number;
}

export interface RankingResponse {
  criterion: RankingCriterion;
  // Em grupo encerrado, o dia em que o ranking congelou.
  as_of: string;
  items: RankingItem[];
  me: { position: number; score: number };
}

export interface GroupStatistics {
  as_of: string;
  most_consistent: {
    user: UserRef;
    habit: HabitRef;
    consistent_days: number;
  } | null;
  best_record: {
    user: UserRef;
    habit: HabitRef;
    best_streak: number;
    // A unidade do recorde: dias, semanas ou meses.
    unit: GoalPeriod;
  } | null;
  check_ins_last_7_days: number;
}

export interface MemberHabitStats {
  user: UserRef;
  // Aqui o `status` vem certo (contorno do bug L1).
  progress: HabitProgress;
  check_in_days: number;
}

export interface GroupHabitStatistics {
  as_of: string;
  habit_id: string;
  name: string;
  habit_status: HabitStatus;
  members: MemberHabitStats[];
}
