/**
 * Testes do serviço de grupos (groups-api.ts).
 * Valida que cada função chama o endpoint correto com os parâmetros corretos.
 * Issue: #182 – [Test] Testes de grupos
 */
import { request, ApiError } from "@/services/api";
import {
  listGroups,
  createGroup,
  getGroup,
  updateGroup,
  getInvitePreview,
  joinGroup,
  regenerateInvite,
  addMember,
  promoteMember,
  removeMember,
  leaveGroup,
  listGroupHabits,
  createGroupHabit,
  updateGroupHabit,
  finishGroupHabit,
  getGroupHabit,
  getGroupHabitStats,
  getGroupFeed,
  getGroupRanking,
  getGroupStats,
} from "@/services/groups-api";
import type {
  GroupDetail,
  GroupSummary,
  GroupInvitePreview,
  GroupFeedPage,
  GroupRanking,
  GroupStats,
  GroupHabit,
  GroupHabitStats,
  LeaveGroupResponse,
} from "@/services/types/groups";

jest.mock("@/services/api", () => ({
  ...jest.requireActual("@/services/api"),
  request: jest.fn(),
}));

const mockRequest = request as jest.MockedFunction<typeof request>;

// ── Fixtures ─────────────────────────────────────────────────────────────────

const groupSummary: GroupSummary = {
  id: "grp-1",
  name: "Equipe Alpha",
  status: "active",
  member_count: 3,
  my_role: "admin",
};

const groupDetail: GroupDetail = {
  ...groupSummary,
  description: "Grupo de foco em corrida",
  starts_on: "2026-11-01",
  ends_on: "2026-11-30",
  ranking_criterion: "check_ins",
  invite_code: "ALPHA-123",
  created_at: "2026-11-01T10:00:00Z",
};

const groupHabit: GroupHabit = {
  id: "gh-1",
  name: "Correr 5 km",
  description: null,
  category: "corrida",
  status: "active",
  goal: null,
  created_at: "2026-11-01T10:00:00Z",
  target_end_date: null,
  finished_at: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── listGroups ────────────────────────────────────────────────────────────────

describe("listGroups", () => {
  it("calls GET /groups", async () => {
    mockRequest.mockResolvedValue([groupSummary]);
    const result = await listGroups();
    expect(mockRequest).toHaveBeenCalledWith("/groups");
    expect(result).toEqual([groupSummary]);
  });
});

// ── createGroup ───────────────────────────────────────────────────────────────

describe("createGroup", () => {
  it("calls POST /groups with the correct body", async () => {
    mockRequest.mockResolvedValue(groupDetail);
    const body = {
      name: "Equipe Alpha",
      description: "Grupo de foco em corrida",
      ends_on: "2026-11-30",
      ranking_criterion: "check_ins" as const,
    };
    const result = await createGroup(body);
    expect(mockRequest).toHaveBeenCalledWith("/groups", {
      method: "POST",
      body: JSON.stringify(body),
    });
    expect(result).toEqual(groupDetail);
  });

  it("propagates 422 field errors", async () => {
    mockRequest.mockRejectedValue(
      new ApiError("Validation error", 422, {
        detail: [{ loc: ["body", "name"], msg: "String should have at most 100 characters" }],
      }),
    );
    await expect(createGroup({ name: "x".repeat(101) })).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});

// ── getGroup ──────────────────────────────────────────────────────────────────

describe("getGroup", () => {
  it("calls GET /groups/{id}", async () => {
    mockRequest.mockResolvedValue(groupDetail);
    const result = await getGroup("grp-1");
    expect(mockRequest).toHaveBeenCalledWith("/groups/grp-1");
    expect(result).toEqual(groupDetail);
  });

  it("propagates 404 when group is not found", async () => {
    mockRequest.mockRejectedValue(
      new ApiError("Grupo não encontrado.", 404, { detail: "Grupo não encontrado." }),
    );
    await expect(getGroup("unknown-id")).rejects.toMatchObject({ status: 404 });
  });
});

// ── updateGroup ───────────────────────────────────────────────────────────────

describe("updateGroup", () => {
  it("calls PATCH /groups/{id} with only the changed fields", async () => {
    const updated = { ...groupDetail, name: "Equipe Beta" };
    mockRequest.mockResolvedValue(updated);
    const result = await updateGroup("grp-1", { name: "Equipe Beta" });
    expect(mockRequest).toHaveBeenCalledWith("/groups/grp-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Equipe Beta" }),
    });
    expect(result.name).toBe("Equipe Beta");
  });

  it("sends ends_on: null to remove the end date", async () => {
    mockRequest.mockResolvedValue({ ...groupDetail, ends_on: null });
    await updateGroup("grp-1", { ends_on: null });
    expect(mockRequest).toHaveBeenCalledWith("/groups/grp-1", {
      method: "PATCH",
      body: JSON.stringify({ ends_on: null }),
    });
  });

  it("propagates 403 when user is not admin", async () => {
    mockRequest.mockRejectedValue(
      new ApiError("Sem permissão.", 403, { detail: "Sem permissão." }),
    );
    await expect(updateGroup("grp-1", { name: "X" })).rejects.toMatchObject({
      status: 403,
    });
  });
});

// ── getInvitePreview ──────────────────────────────────────────────────────────

describe("getInvitePreview", () => {
  it("calls GET /groups/invite/{code}", async () => {
    const preview: GroupInvitePreview = {
      group_id: "grp-1",
      name: "Equipe Alpha",
      status: "active",
      member_count: 3,
    };
    mockRequest.mockResolvedValue(preview);
    const result = await getInvitePreview("ALPHA-123");
    expect(mockRequest).toHaveBeenCalledWith("/groups/invite/ALPHA-123");
    expect(result).toEqual(preview);
  });

  it("propagates 404 for invalid invite code", async () => {
    mockRequest.mockRejectedValue(
      new ApiError("Código de convite inválido.", 404, {
        detail: "Código de convite inválido.",
      }),
    );
    await expect(getInvitePreview("INVALID")).rejects.toMatchObject({
      status: 404,
    });
  });
});

// ── joinGroup ─────────────────────────────────────────────────────────────────

describe("joinGroup", () => {
  it("calls POST /groups/join with the code", async () => {
    mockRequest.mockResolvedValue({ group_id: "grp-1" });
    const result = await joinGroup("ALPHA-123");
    expect(mockRequest).toHaveBeenCalledWith("/groups/join", {
      method: "POST",
      body: JSON.stringify({ code: "ALPHA-123" }),
    });
    expect(result).toEqual({ group_id: "grp-1" });
  });

  it("propagates 409 for group already joined", async () => {
    mockRequest.mockRejectedValue(
      new ApiError("Você já participa deste grupo.", 409, {
        detail: "Você já participa deste grupo.",
      }),
    );
    await expect(joinGroup("ALPHA-123")).rejects.toMatchObject({ status: 409 });
  });

  it("propagates 409 for ended group", async () => {
    mockRequest.mockRejectedValue(
      new ApiError("Grupo encerrado.", 409, { detail: "Grupo encerrado." }),
    );
    await expect(joinGroup("ENDED-CODE")).rejects.toMatchObject({ status: 409 });
  });
});

// ── regenerateInvite ──────────────────────────────────────────────────────────

describe("regenerateInvite", () => {
  it("calls POST /groups/{id}/invite/regenerate", async () => {
    const updated = { ...groupDetail, invite_code: "NEW-CODE" };
    mockRequest.mockResolvedValue(updated);
    const result = await regenerateInvite("grp-1");
    expect(mockRequest).toHaveBeenCalledWith(
      "/groups/grp-1/invite/regenerate",
      { method: "POST" },
    );
    expect(result.invite_code).toBe("NEW-CODE");
  });
});

// ── addMember ─────────────────────────────────────────────────────────────────

describe("addMember", () => {
  it("calls POST /groups/{id}/members with username", async () => {
    mockRequest.mockResolvedValue(undefined);
    await addMember("grp-1", { username: "novo_membro" });
    expect(mockRequest).toHaveBeenCalledWith("/groups/grp-1/members", {
      method: "POST",
      body: JSON.stringify({ username: "novo_membro" }),
    });
  });

  it("propagates 404 when user is not found", async () => {
    mockRequest.mockRejectedValue(
      new ApiError("Usuário não encontrado.", 404, {
        detail: "Usuário não encontrado.",
      }),
    );
    await expect(addMember("grp-1", { username: "ghost" })).rejects.toMatchObject(
      { status: 404 },
    );
  });

  it("propagates 409 when user is already a member", async () => {
    mockRequest.mockRejectedValue(
      new ApiError("Usuário já é membro.", 409, {
        detail: "Usuário já é membro.",
      }),
    );
    await expect(
      addMember("grp-1", { username: "existing" }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

// ── promoteMember ─────────────────────────────────────────────────────────────

describe("promoteMember", () => {
  it("calls POST /groups/{id}/members/{user_id}/promote", async () => {
    mockRequest.mockResolvedValue(undefined);
    await promoteMember("grp-1", "user-2");
    expect(mockRequest).toHaveBeenCalledWith(
      "/groups/grp-1/members/user-2/promote",
      { method: "POST" },
    );
  });
});

// ── removeMember ──────────────────────────────────────────────────────────────

describe("removeMember", () => {
  it("calls DELETE /groups/{id}/members/{user_id}", async () => {
    mockRequest.mockResolvedValue(undefined);
    await removeMember("grp-1", "user-2");
    expect(mockRequest).toHaveBeenCalledWith(
      "/groups/grp-1/members/user-2",
      { method: "DELETE" },
    );
  });

  it("propagates 403 when not admin", async () => {
    mockRequest.mockRejectedValue(
      new ApiError("Sem permissão.", 403, { detail: "Sem permissão." }),
    );
    await expect(removeMember("grp-1", "user-2")).rejects.toMatchObject({
      status: 403,
    });
  });
});

// ── leaveGroup ────────────────────────────────────────────────────────────────

describe("leaveGroup", () => {
  it("calls POST /groups/{id}/leave and returns the response", async () => {
    const response: LeaveGroupResponse = {
      group_deleted: false,
      promoted_user_id: null,
      promoted_username: null,
    };
    mockRequest.mockResolvedValue(response);
    const result = await leaveGroup("grp-1");
    expect(mockRequest).toHaveBeenCalledWith("/groups/grp-1/leave", {
      method: "POST",
    });
    expect(result).toEqual(response);
  });

  it("returns group_deleted: true when last member leaves", async () => {
    mockRequest.mockResolvedValue({
      group_deleted: true,
      promoted_user_id: null,
      promoted_username: null,
    });
    const result = await leaveGroup("grp-1");
    expect(result.group_deleted).toBe(true);
  });

  it("returns promoted_user_id when admin transfers leadership", async () => {
    mockRequest.mockResolvedValue({
      group_deleted: false,
      promoted_user_id: "user-2",
      promoted_username: "novo_admin",
    });
    const result = await leaveGroup("grp-1");
    expect(result.promoted_user_id).toBe("user-2");
    expect(result.promoted_username).toBe("novo_admin");
  });
});

// ── listGroupHabits ───────────────────────────────────────────────────────────

describe("listGroupHabits", () => {
  it("calls GET /groups/{id}/habits", async () => {
    mockRequest.mockResolvedValue([groupHabit]);
    const result = await listGroupHabits("grp-1");
    expect(mockRequest).toHaveBeenCalledWith("/groups/grp-1/habits");
    expect(result).toEqual([groupHabit]);
  });
});

// ── createGroupHabit ──────────────────────────────────────────────────────────

describe("createGroupHabit", () => {
  it("calls POST /groups/{id}/habits with the correct body", async () => {
    mockRequest.mockResolvedValue(groupHabit);
    const body = { name: "Correr 5 km", category: "corrida" as const };
    await createGroupHabit("grp-1", body);
    expect(mockRequest).toHaveBeenCalledWith("/groups/grp-1/habits", {
      method: "POST",
      body: JSON.stringify(body),
    });
  });

  it("propagates 409 for ended group", async () => {
    mockRequest.mockRejectedValue(
      new ApiError("Grupo encerrado.", 409, { detail: "Grupo encerrado." }),
    );
    await expect(
      createGroupHabit("grp-ended", { name: "X", category: "outros" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("propagates 403 when not admin", async () => {
    mockRequest.mockRejectedValue(
      new ApiError("Sem permissão.", 403, { detail: "Sem permissão." }),
    );
    await expect(
      createGroupHabit("grp-1", { name: "X", category: "outros" }),
    ).rejects.toMatchObject({ status: 403 });
  });
});

// ── updateGroupHabit ──────────────────────────────────────────────────────────

describe("updateGroupHabit", () => {
  it("calls PATCH /groups/{id}/habits/{habit_id} with the correct body", async () => {
    mockRequest.mockResolvedValue({ ...groupHabit, name: "Correr 10 km" });
    await updateGroupHabit("grp-1", "gh-1", { name: "Correr 10 km" });
    expect(mockRequest).toHaveBeenCalledWith("/groups/grp-1/habits/gh-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Correr 10 km" }),
    });
  });

  it("does not send goal field (not editable)", async () => {
    mockRequest.mockResolvedValue(groupHabit);
    // A API não aceita `goal` no PATCH; verificamos que não é enviado
    await updateGroupHabit("grp-1", "gh-1", { name: "Novo nome" });
    const callBody = JSON.parse(
      (mockRequest.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(callBody).not.toHaveProperty("goal");
  });

  it("propagates 409 for ended group", async () => {
    mockRequest.mockRejectedValue(
      new ApiError("Grupo encerrado.", 409, { detail: "Grupo encerrado." }),
    );
    await expect(
      updateGroupHabit("grp-ended", "gh-1", { name: "X" }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

// ── finishGroupHabit ──────────────────────────────────────────────────────────

describe("finishGroupHabit", () => {
  it("calls POST /groups/{id}/habits/{habit_id}/finish", async () => {
    mockRequest.mockResolvedValue({ ...groupHabit, status: "ended" });
    const result = await finishGroupHabit("grp-1", "gh-1");
    expect(mockRequest).toHaveBeenCalledWith(
      "/groups/grp-1/habits/gh-1/finish",
      { method: "POST" },
    );
    expect(result.status).toBe("ended");
  });

  it("propagates 409 for already ended habit", async () => {
    mockRequest.mockRejectedValue(
      new ApiError("Hábito já encerrado.", 409, {
        detail: "Hábito já encerrado.",
      }),
    );
    await expect(finishGroupHabit("grp-1", "gh-ended")).rejects.toMatchObject({
      status: 409,
    });
  });
});

// ── getGroupHabit + getGroupHabitStats ────────────────────────────────────────

describe("getGroupHabit", () => {
  it("calls GET /groups/{id}/habits/{habit_id}", async () => {
    mockRequest.mockResolvedValue(groupHabit);
    const result = await getGroupHabit("grp-1", "gh-1");
    expect(mockRequest).toHaveBeenCalledWith("/groups/grp-1/habits/gh-1");
    expect(result).toEqual(groupHabit);
  });
});

describe("getGroupHabitStats", () => {
  it("calls GET /groups/{id}/habits/{habit_id}/stats", async () => {
    const stats: GroupHabitStats = {
      habit_id: "gh-1",
      members: [
        {
          user_id: "user-1",
          username: "alice",
          name: "Alice",
          check_in_days: 5,
          current_streak: 3,
          progress_done: 3,
          progress_target: 4,
        },
      ],
    };
    mockRequest.mockResolvedValue(stats);
    const result = await getGroupHabitStats("grp-1", "gh-1");
    expect(mockRequest).toHaveBeenCalledWith(
      "/groups/grp-1/habits/gh-1/stats",
    );
    expect(result.members).toHaveLength(1);
    expect(result.members[0].username).toBe("alice");
  });
});

// ── getGroupFeed ──────────────────────────────────────────────────────────────

describe("getGroupFeed", () => {
  const feedPage: GroupFeedPage = {
    items: [
      {
        id: "feed-1",
        user_id: "user-1",
        username: "alice",
        title: "Corri!",
        description: null,
        created_at: "2026-11-10T08:00:00Z",
        habit_names: ["Correr 5 km"],
      },
    ],
    next_cursor: "cursor-abc",
    has_more: true,
  };

  it("calls GET /groups/{id}/feed without params on first load", async () => {
    mockRequest.mockResolvedValue(feedPage);
    await getGroupFeed("grp-1");
    expect(mockRequest).toHaveBeenCalledWith("/groups/grp-1/feed");
  });

  it("sends before param for pagination (older items)", async () => {
    mockRequest.mockResolvedValue({ ...feedPage, has_more: false });
    await getGroupFeed("grp-1", { before: "cursor-abc" });
    expect(mockRequest).toHaveBeenCalledWith(
      "/groups/grp-1/feed?before=cursor-abc",
    );
  });

  it("sends after param for auto-update (newer items)", async () => {
    mockRequest.mockResolvedValue({ ...feedPage, next_cursor: null, has_more: false });
    await getGroupFeed("grp-1", { after: "cursor-abc" });
    expect(mockRequest).toHaveBeenCalledWith(
      "/groups/grp-1/feed?after=cursor-abc",
    );
  });

  it("encodes opaque cursor values without interpreting them", async () => {
    mockRequest.mockResolvedValue(feedPage);
    await getGroupFeed("grp-1", { before: "opaque+cursor /==" });
    expect(mockRequest).toHaveBeenCalledWith(
      "/groups/grp-1/feed?before=opaque%2Bcursor+%2F%3D%3D",
    );
  });

  it("does not send both before and after together", async () => {
    expect(() =>
      // @ts-expect-error The API contract forbids both cursor directions.
      getGroupFeed("grp-1", {
        before: "cursor-before",
        after: "cursor-after",
      }),
    ).toThrow("Only one group feed cursor may be provided.");
    expect(mockRequest).not.toHaveBeenCalled();
  });
});

// ── getGroupRanking ───────────────────────────────────────────────────────────

describe("getGroupRanking", () => {
  const ranking: GroupRanking = {
    entries: [
      {
        position: 1,
        user_id: "user-1",
        username: "alice",
        name: "Alice",
        score: 10,
        me: true,
      },
      {
        position: 1,
        user_id: "user-2",
        username: "bob",
        name: "Bob",
        score: 10,
        me: false,
      },
      {
        position: 3,
        user_id: "user-3",
        username: "carol",
        name: "Carol",
        score: 7,
        me: false,
      },
    ],
    criterion: "check_ins",
    as_of: null,
    group_status: "active",
  };

  it("calls GET /groups/{id}/ranking", async () => {
    mockRequest.mockResolvedValue(ranking);
    const result = await getGroupRanking("grp-1");
    expect(mockRequest).toHaveBeenCalledWith("/groups/grp-1/ranking");
    expect(result).toEqual(ranking);
  });

  it("preserves positions from API without recalculating", async () => {
    mockRequest.mockResolvedValue(ranking);
    const result = await getGroupRanking("grp-1");
    // Posições 1, 1, 3 (empate) devem ser preservadas exatamente
    expect(result.entries[0].position).toBe(1);
    expect(result.entries[1].position).toBe(1);
    expect(result.entries[2].position).toBe(3);
  });
});

// ── getGroupStats ─────────────────────────────────────────────────────────────

describe("getGroupStats", () => {
  it("calls GET /groups/{id}/stats", async () => {
    const stats: GroupStats = {
      most_consistent: {
        username: "alice",
        habit_name: "Correr 5 km",
        streak_days: 14,
      },
      best_record: {
        username: "bob",
        habit_name: "Leitura",
        value: 30,
        unit: "days",
      },
      check_ins_last_7_days: 42,
    };
    mockRequest.mockResolvedValue(stats);
    const result = await getGroupStats("grp-1");
    expect(mockRequest).toHaveBeenCalledWith("/groups/grp-1/stats");
    expect(result.check_ins_last_7_days).toBe(42);
  });

  it("returns null for most_consistent when nobody has scored", async () => {
    mockRequest.mockResolvedValue({
      most_consistent: null,
      best_record: null,
      check_ins_last_7_days: 0,
    });
    const result = await getGroupStats("grp-1");
    expect(result.most_consistent).toBeNull();
    expect(result.best_record).toBeNull();
  });
});
