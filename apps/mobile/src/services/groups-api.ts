import { request } from "@/services/api";
import type {
  AddMemberRequest,
  GroupCreate,
  GroupDetail,
  GroupFeedPage,
  GroupFeedParams,
  GroupHabit,
  GroupHabitCreate,
  GroupHabitStats,
  GroupHabitUpdate,
  GroupInvitePreview,
  GroupRanking,
  GroupStats,
  GroupSummary,
  GroupUpdate,
  JoinGroupResponse,
  LeaveGroupResponse,
} from "@/services/types/groups";

// ── Grupos ───────────────────────────────────────────────────────────────────

export function listGroups(): Promise<GroupSummary[]> {
  return request<GroupSummary[]>("/groups");
}

export function createGroup(body: GroupCreate): Promise<GroupDetail> {
  return request<GroupDetail>("/groups", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getGroup(id: string): Promise<GroupDetail> {
  return request<GroupDetail>(`/groups/${id}`);
}

export function updateGroup(
  id: string,
  changes: GroupUpdate,
): Promise<GroupDetail> {
  return request<GroupDetail>(`/groups/${id}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

// ── Convite ──────────────────────────────────────────────────────────────────

export function getInvitePreview(code: string): Promise<GroupInvitePreview> {
  return request<GroupInvitePreview>(`/groups/invite/${code}`);
}

export function joinGroup(code: string): Promise<JoinGroupResponse> {
  return request<JoinGroupResponse>("/groups/join", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function regenerateInvite(groupId: string): Promise<GroupDetail> {
  return request<GroupDetail>(`/groups/${groupId}/invite/regenerate`, {
    method: "POST",
  });
}

// ── Membros ──────────────────────────────────────────────────────────────────

export function addMember(
  groupId: string,
  body: AddMemberRequest,
): Promise<void> {
  return request<void>(`/groups/${groupId}/members`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function promoteMember(
  groupId: string,
  userId: string,
): Promise<void> {
  return request<void>(`/groups/${groupId}/members/${userId}/promote`, {
    method: "POST",
  });
}

export function removeMember(
  groupId: string,
  userId: string,
): Promise<void> {
  return request<void>(`/groups/${groupId}/members/${userId}`, {
    method: "DELETE",
  });
}

export function leaveGroup(groupId: string): Promise<LeaveGroupResponse> {
  return request<LeaveGroupResponse>(`/groups/${groupId}/leave`, {
    method: "POST",
  });
}

// ── Hábitos do grupo ─────────────────────────────────────────────────────────

export function listGroupHabits(groupId: string): Promise<GroupHabit[]> {
  return request<GroupHabit[]>(`/groups/${groupId}/habits`);
}

export function createGroupHabit(
  groupId: string,
  body: GroupHabitCreate,
): Promise<GroupHabit> {
  return request<GroupHabit>(`/groups/${groupId}/habits`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateGroupHabit(
  groupId: string,
  habitId: string,
  changes: GroupHabitUpdate,
): Promise<GroupHabit> {
  return request<GroupHabit>(`/groups/${groupId}/habits/${habitId}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export function finishGroupHabit(
  groupId: string,
  habitId: string,
): Promise<GroupHabit> {
  return request<GroupHabit>(`/groups/${groupId}/habits/${habitId}/finish`, {
    method: "POST",
  });
}

export function getGroupHabit(
  groupId: string,
  habitId: string,
): Promise<GroupHabit> {
  return request<GroupHabit>(`/groups/${groupId}/habits/${habitId}`);
}

export function getGroupHabitStats(
  groupId: string,
  habitId: string,
): Promise<GroupHabitStats> {
  return request<GroupHabitStats>(
    `/groups/${groupId}/habits/${habitId}/stats`,
  );
}

// ── Feed ─────────────────────────────────────────────────────────────────────

export function getGroupFeed(
  groupId: string,
  params: GroupFeedParams = {},
): Promise<GroupFeedPage> {
  if (params.before !== undefined && params.after !== undefined) {
    throw new Error("Only one group feed cursor may be provided.");
  }

  const query = new URLSearchParams();
  if (params.before !== undefined) query.set("before", params.before);
  if (params.after !== undefined) query.set("after", params.after);
  const qs = query.toString() ? `?${query.toString()}` : "";
  return request<GroupFeedPage>(`/groups/${groupId}/feed${qs}`);
}

// ── Ranking e estatísticas ───────────────────────────────────────────────────

export function getGroupRanking(groupId: string): Promise<GroupRanking> {
  return request<GroupRanking>(`/groups/${groupId}/ranking`);
}

export function getGroupStats(groupId: string): Promise<GroupStats> {
  return request<GroupStats>(`/groups/${groupId}/stats`);
}
