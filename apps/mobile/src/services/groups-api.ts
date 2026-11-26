import { request, toQueryString } from "@/services/api";
import type {
  FeedParams,
  GroupCreate,
  GroupDetail,
  GroupHabit,
  GroupHabitCreate,
  GroupHabitUpdate,
  GroupMember,
  GroupPreview,
  GroupUpdate,
  InviteCode,
  LeaveResult,
} from "@/services/types/groups";
import type { HabitStatus } from "@/services/types/habits";

/**
 * Chaves do SWR das telas de grupo. Cada chave é a própria rota do GET, então
 * as telas buscam com `useSWR(groupKeys.detail(id), request)`. As funções
 * abaixo são só as que alteram dados.
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

/** Quem cria vira o primeiro administrador. */
export function createGroup(body: GroupCreate): Promise<GroupDetail> {
  return request<GroupDetail>(groupKeys.list, {
    method: "POST",
    body: JSON.stringify(body),
  });
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
