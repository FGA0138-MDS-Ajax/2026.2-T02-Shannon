import { request, toQueryString } from "@/services/api";
import type {
  FeedPage,
  FeedParams,
  GroupCreate,
  GroupDetail,
  GroupHabit,
  GroupHabitCreate,
  GroupHabitStatistics,
  GroupHabitUpdate,
  GroupListItem,
  GroupMember,
  GroupPreview,
  GroupStatistics,
  GroupUpdate,
  InviteCode,
  LeaveResult,
  Ranking,
} from "@/services/types/groups";
import type { HabitStatus } from "@/services/types/habits";

/**
 * Chaves do SWR das telas de grupo. Os GETs abaixo usam a própria rota como
 * chave, então `useSWR(groupKeys.detail(id), request)` e `getGroup(id)`
 * buscam a mesma coisa.
 */
export const groupKeys = {
  list: "/groups",
  detail: (id: string) => `/groups/${id}`,
  habits: (id: string, status?: HabitStatus) =>
    `/groups/${id}/habits${toQueryString({ status })}`,
  habit: (id: string, habitId: string) => `/groups/${id}/habits/${habitId}`,
  habitStats: (id: string, habitId: string) =>
    `/groups/${id}/habits/${habitId}/stats`,
  feed: (id: string, params: FeedParams = {}) =>
    `/groups/${id}/check-ins${toQueryString(params)}`,
  ranking: (id: string) => `/groups/${id}/ranking`,
  stats: (id: string) => `/groups/${id}/stats`,
};

/** Tira espaços e hífens e põe em maiúsculas, como o back faz. */
export function normalizeInviteCode(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

// Grupos ----------------------------------------------------------------------

/** Grupos de que o usuário participa, ativos e encerrados. */
export function listGroups(): Promise<GroupListItem[]> {
  return request<GroupListItem[]>(groupKeys.list);
}

/** Quem cria vira o primeiro administrador. */
export function createGroup(body: GroupCreate): Promise<GroupDetail> {
  return request<GroupDetail>(groupKeys.list, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getGroup(id: string): Promise<GroupDetail> {
  return request<GroupDetail>(groupKeys.detail(id));
}

/** Só admin. Envie só os campos alterados; `ends_on: null` reabre o grupo. */
export function updateGroup(
  id: string,
  changes: GroupUpdate,
): Promise<GroupDetail> {
  return request<GroupDetail>(groupKeys.detail(id), {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

// Convite ---------------------------------------------------------------------

/** Mostra o grupo do código sem entrar nele. 404 se o código não vale. */
export function previewGroup(code: string): Promise<GroupPreview> {
  return request<GroupPreview>(
    `/groups/invite/${encodeURIComponent(normalizeInviteCode(code))}`,
  );
}

export function joinGroup(code: string): Promise<GroupDetail> {
  return request<GroupDetail>("/groups/join", {
    method: "POST",
    body: JSON.stringify({ code: normalizeInviteCode(code) }),
  });
}

/** Só admin. O código anterior deixa de valer na hora. */
export function regenerateInviteCode(id: string): Promise<InviteCode> {
  return request<InviteCode>(`/groups/${id}/invite/regenerate`, {
    method: "POST",
  });
}

// Integrantes -----------------------------------------------------------------

export function listMembers(id: string): Promise<GroupMember[]> {
  return request<GroupMember[]>(`/groups/${id}/members`);
}

/** Só admin. 409 se o grupo estiver cheio ou encerrado. */
export function addMember(id: string, username: string): Promise<GroupMember> {
  return request<GroupMember>(`/groups/${id}/members`, {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

/** Só admin, e não pode remover a si mesmo (use leaveGroup). */
export function removeMember(id: string, userId: string): Promise<void> {
  return request<void>(`/groups/${id}/members/${userId}`, {
    method: "DELETE",
  });
}

export function promoteMember(
  id: string,
  userId: string,
): Promise<GroupMember> {
  return request<GroupMember>(`/groups/${id}/members/${userId}/promote`, {
    method: "POST",
  });
}

/**
 * Se for o último admin, o integrante mais antigo assume. Se for o último
 * integrante, o grupo é apagado.
 */
export function leaveGroup(id: string): Promise<LeaveResult> {
  return request<LeaveResult>(`/groups/${id}/leave`, { method: "POST" });
}

// Hábitos do grupo ------------------------------------------------------------

export function listGroupHabits(
  id: string,
  status?: HabitStatus,
): Promise<GroupHabit[]> {
  return request<GroupHabit[]>(groupKeys.habits(id, status));
}

/** Só admin. A meta é obrigatória e não muda depois. */
export function createGroupHabit(
  id: string,
  body: GroupHabitCreate,
): Promise<GroupHabit> {
  return request<GroupHabit>(`/groups/${id}/habits`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getGroupHabit(
  id: string,
  habitId: string,
): Promise<GroupHabit> {
  return request<GroupHabit>(groupKeys.habit(id, habitId));
}

/** Só admin. Envie só os campos alterados. */
export function updateGroupHabit(
  id: string,
  habitId: string,
  changes: GroupHabitUpdate,
): Promise<GroupHabit> {
  return request<GroupHabit>(groupKeys.habit(id, habitId), {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

/** Só admin. O progresso de todos fica congelado na data de hoje. */
export function finishGroupHabit(
  id: string,
  habitId: string,
): Promise<GroupHabit> {
  return request<GroupHabit>(`/groups/${id}/habits/${habitId}/finish`, {
    method: "POST",
  });
}

// Feed, ranking e estatísticas ------------------------------------------------

/** Do mais novo ao mais antigo. Para rolar, passe o `next_cursor` em `before`. */
export function listGroupFeed(
  id: string,
  params: FeedParams = {},
): Promise<FeedPage> {
  return request<FeedPage>(groupKeys.feed(id, params));
}

export function getGroupRanking(id: string): Promise<Ranking> {
  return request<Ranking>(groupKeys.ranking(id));
}

export function getGroupStatistics(id: string): Promise<GroupStatistics> {
  return request<GroupStatistics>(groupKeys.stats(id));
}

export function getGroupHabitStatistics(
  id: string,
  habitId: string,
): Promise<GroupHabitStatistics> {
  return request<GroupHabitStatistics>(groupKeys.habitStats(id, habitId));
}
