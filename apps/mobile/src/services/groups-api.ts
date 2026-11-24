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
  GroupPreview,
  GroupStatistics,
  GroupUpdate,
  InviteCodePublic,
  LeaveResult,
  MemberPublic,
  RankingResponse,
} from "@/services/types/groups";
import type { HabitStatus } from "@/services/types/habits";

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function patch<T>(path: string, changes: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(changes) });
}

// Grupos

export function createGroup(body: GroupCreate): Promise<GroupDetail> {
  return post<GroupDetail>("/groups", body);
}

/** Grupos de que o usuário participa, ativos primeiro. */
export function listGroups(): Promise<GroupListItem[]> {
  return request<GroupListItem[]>("/groups");
}

export function getGroup(groupId: string): Promise<GroupDetail> {
  return request<GroupDetail>(`/groups/${groupId}`);
}

/** Só admin. Trocar o critério muda o ranking de todo o grupo: confirme antes. */
export function updateGroup(
  groupId: string,
  changes: GroupUpdate,
): Promise<GroupDetail> {
  return patch<GroupDetail>(`/groups/${groupId}`, changes);
}

// Membros

export function listMembers(groupId: string): Promise<MemberPublic[]> {
  return request<MemberPublic[]>(`/groups/${groupId}/members`);
}

export function addMember(
  groupId: string,
  username: string,
): Promise<MemberPublic> {
  return post<MemberPublic>(`/groups/${groupId}/members`, { username });
}

export function removeMember(groupId: string, userId: string): Promise<void> {
  return request<void>(`/groups/${groupId}/members/${userId}`, {
    method: "DELETE",
  });
}

export function promoteMember(
  groupId: string,
  userId: string,
): Promise<MemberPublic> {
  return post<MemberPublic>(`/groups/${groupId}/members/${userId}/promote`);
}

/** O último a sair apaga o grupo; se sair o único admin, o mais antigo vira admin. */
export function leaveGroup(groupId: string): Promise<LeaveResult> {
  return post<LeaveResult>(`/groups/${groupId}/leave`);
}

// Convite. O código vai como o usuário digitou: a API ignora maiúsculas,
// espaços e hífens.

export function previewInvite(code: string): Promise<GroupPreview> {
  return request<GroupPreview>(`/groups/invite/${encodeURIComponent(code)}`);
}

export function joinGroup(code: string): Promise<GroupDetail> {
  return post<GroupDetail>("/groups/join", { code });
}

/** O código antigo para de funcionar na hora. */
export function regenerateInvite(groupId: string): Promise<InviteCodePublic> {
  return post<InviteCodePublic>(`/groups/${groupId}/invite/regenerate`);
}

// Hábitos do grupo

export function listGroupHabits(
  groupId: string,
  status?: HabitStatus,
): Promise<GroupHabit[]> {
  return request<GroupHabit[]>(
    `/groups/${groupId}/habits${toQueryString({ status })}`,
  );
}

export function createGroupHabit(
  groupId: string,
  body: GroupHabitCreate,
): Promise<GroupHabit> {
  return post<GroupHabit>(`/groups/${groupId}/habits`, body);
}

export function getGroupHabit(
  groupId: string,
  habitId: string,
): Promise<GroupHabit> {
  return request<GroupHabit>(`/groups/${groupId}/habits/${habitId}`);
}

export function updateGroupHabit(
  groupId: string,
  habitId: string,
  changes: GroupHabitUpdate,
): Promise<GroupHabit> {
  return patch<GroupHabit>(`/groups/${groupId}/habits/${habitId}`, changes);
}

export function finishGroupHabit(
  groupId: string,
  habitId: string,
): Promise<GroupHabit> {
  return post<GroupHabit>(`/groups/${groupId}/habits/${habitId}/finish`);
}

/** Progresso de cada integrante no hábito. */
export function getGroupHabitStats(
  groupId: string,
  habitId: string,
): Promise<GroupHabitStatistics> {
  return request<GroupHabitStatistics>(
    `/groups/${groupId}/habits/${habitId}/stats`,
  );
}

// Feed, ranking e estatísticas

/** Sem cursor: mais recentes. `before`: página mais antiga. `after`: novidades. */
export function getGroupFeed(
  groupId: string,
  params: FeedParams = {},
): Promise<FeedPage> {
  return request<FeedPage>(
    `/groups/${groupId}/check-ins${toQueryString(params)}`,
  );
}

export function getGroupRanking(groupId: string): Promise<RankingResponse> {
  return request<RankingResponse>(`/groups/${groupId}/ranking`);
}

export function getGroupStats(groupId: string): Promise<GroupStatistics> {
  return request<GroupStatistics>(`/groups/${groupId}/stats`);
}
