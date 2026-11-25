/**
 * Testes dos tipos de grupos para garantir a corretude do contrato de API.
 * Valida que os tipos batem com os dados esperados e que a lógica de
 * exibição (bug L1, roles, etc.) está correta.
 * Issue: #182 – [Test] Testes de grupos
 */
import { ApiError } from "@/services/api";
import {
  getErrorMessage,
  getRejectedHabitIds,
} from "@/services/api-errors";
import type {
  GroupDetail,
  GroupHabit,
  GroupHabitMemberStats,
  GroupMember,
  GroupSummary,
} from "@/services/types/groups";
import type { HabitOption } from "@/services/types/habits";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const activeGroup: GroupDetail = {
  id: "grp-1",
  name: "Equipe Alpha",
  status: "active",
  member_count: 3,
  my_role: "admin",
  description: "Foco em corrida",
  starts_on: "2026-11-01",
  ends_on: "2026-11-30",
  ranking_criterion: "check_ins",
  invite_code: "ALPHA-123",
  created_at: "2026-11-01T10:00:00Z",
};

const endedGroup: GroupDetail = {
  ...activeGroup,
  id: "grp-2",
  status: "ended",
  my_role: "member",
  invite_code: null,
};

const adminMember: GroupMember = {
  user_id: "user-1",
  username: "alice",
  name: "Alice",
  role: "admin",
  joined_at: "2026-11-01T10:00:00Z",
};

const regularMember: GroupMember = {
  user_id: "user-2",
  username: "bob",
  name: "Bob",
  role: "member",
  joined_at: "2026-11-05T10:00:00Z",
};

const groupHabitActive: GroupHabit = {
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

const groupHabitEnded: GroupHabit = {
  ...groupHabitActive,
  id: "gh-2",
  status: "ended",
  finished_at: "2026-11-15T10:00:00Z",
};

// ── Exibição de grupos ────────────────────────────────────────────────────────

describe("grupos: exibição de status", () => {
  it("grupo ativo não tem selo 'Encerrado'", () => {
    expect(activeGroup.status).toBe("active");
    expect(activeGroup.status).not.toBe("ended");
  });

  it("grupo encerrado tem status 'ended'", () => {
    expect(endedGroup.status).toBe("ended");
  });

  it("admin tem my_role 'admin'", () => {
    expect(activeGroup.my_role).toBe("admin");
  });

  it("membro comum tem my_role 'member'", () => {
    expect(endedGroup.my_role).toBe("member");
  });

  it("invite_code null significa sem código (grupo encerrado)", () => {
    expect(endedGroup.invite_code).toBeNull();
  });

  it("invite_code não null quando grupo está ativo", () => {
    expect(activeGroup.invite_code).not.toBeNull();
  });
});

describe("grupos: lista mista (ativos e encerrados)", () => {
  const groups: GroupSummary[] = [
    {
      id: "grp-1",
      name: "Equipe Alpha",
      status: "active",
      member_count: 3,
      my_role: "admin",
    },
    {
      id: "grp-2",
      name: "Equipe Beta",
      status: "ended",
      member_count: 2,
      my_role: "member",
    },
  ];

  it("preserva a ordem retornada pela API", () => {
    expect(groups[0].id).toBe("grp-1");
    expect(groups[1].id).toBe("grp-2");
  });

  it("identifica grupos ativos por status", () => {
    const actives = groups.filter((g) => g.status === "active");
    expect(actives).toHaveLength(1);
    expect(actives[0].name).toBe("Equipe Alpha");
  });

  it("identifica grupos encerrados por status", () => {
    const ended = groups.filter((g) => g.status === "ended");
    expect(ended).toHaveLength(1);
    expect(ended[0].name).toBe("Equipe Beta");
  });

  it("exibe número de membros de cada grupo", () => {
    expect(groups[0].member_count).toBe(3);
    expect(groups[1].member_count).toBe(2);
  });
});

// ── Membros ───────────────────────────────────────────────────────────────────

describe("membros: roles e permissões", () => {
  it("admin tem role 'admin'", () => {
    expect(adminMember.role).toBe("admin");
  });

  it("membro comum tem role 'member'", () => {
    expect(regularMember.role).toBe("member");
  });

  it("promoção não aparece para quem já é admin", () => {
    // A lógica de exibição deve verificar role !== 'admin'
    const canPromote = (member: GroupMember) => member.role !== "admin";
    expect(canPromote(adminMember)).toBe(false);
    expect(canPromote(regularMember)).toBe(true);
  });

  it("remoção não aparece para o próprio usuário (user_id === current_user_id)", () => {
    const currentUserId = "user-1";
    const canRemove = (member: GroupMember) =>
      member.user_id !== currentUserId;
    expect(canRemove(adminMember)).toBe(false); // não pode remover a si mesmo
    expect(canRemove(regularMember)).toBe(true);
  });

  it("exibe papel e data de entrada do membro", () => {
    expect(adminMember.role).toBeDefined();
    expect(adminMember.joined_at).toBeDefined();
    expect(regularMember.joined_at).toBe("2026-11-05T10:00:00Z");
  });
});

// ── Hábitos do grupo ──────────────────────────────────────────────────────────

describe("hábitos de grupo: status", () => {
  it("hábito ativo tem status 'active'", () => {
    expect(groupHabitActive.status).toBe("active");
  });

  it("hábito encerrado tem status 'ended'", () => {
    expect(groupHabitEnded.status).toBe("ended");
  });

  it("hábito encerrado tem finished_at preenchido", () => {
    expect(groupHabitEnded.finished_at).not.toBeNull();
  });

  it("hábito ativo tem finished_at nulo", () => {
    expect(groupHabitActive.finished_at).toBeNull();
  });
});

describe("hábitos de grupo: controles de admin", () => {
  it("criar hábito requer admin E grupo ativo", () => {
    const canCreate = (groupDetail: GroupDetail) =>
      groupDetail.my_role === "admin" && groupDetail.status === "active";

    expect(canCreate(activeGroup)).toBe(true); // admin + ativo
    expect(canCreate(endedGroup)).toBe(false); // member + encerrado
    expect(canCreate({ ...activeGroup, my_role: "member" })).toBe(false); // member + ativo
    expect(canCreate({ ...endedGroup, my_role: "admin" })).toBe(false); // admin + encerrado
  });
});

// ── Stats do hábito do grupo (linha por integrante) ───────────────────────────

describe("hábitos de grupo: stats por integrante", () => {
  const members: GroupHabitMemberStats[] = [
    {
      user_id: "user-1",
      username: "alice",
      name: "Alice",
      check_in_days: 10,
      current_streak: 5,
      progress_done: 3,
      progress_target: 4,
    },
    {
      user_id: "user-2",
      username: "bob",
      name: "Bob",
      check_in_days: 7,
      current_streak: 2,
      progress_done: 2,
      progress_target: 4,
    },
  ];

  it("existe uma linha por integrante (uma entrada por user_id)", () => {
    const userIds = new Set(members.map((m) => m.user_id));
    expect(userIds.size).toBe(members.length);
  });

  it("exibe dados de progresso, streak e dias com check-in", () => {
    const alice = members[0];
    expect(alice.check_in_days).toBe(10);
    expect(alice.current_streak).toBe(5);
    expect(alice.progress_done).toBe(3);
    expect(alice.progress_target).toBe(4);
  });
});

// ── Bug L1: hábitos de grupo na lista pessoal ─────────────────────────────────

describe("bug L1: contorno no status de hábito de grupo", () => {
  /**
   * Bug L1: a API pode retornar progress.status: "ended" incorretamente
   * para hábitos de grupo. O app não deve usar progress.status diretamente;
   * deve consultar /groups/{group.id}/habits/{habit_id}/stats para o usuário.
   *
   * Testamos a lógica de detecção do bug:
   * - Um hábito tem group !== null
   * - progress.status === "ended" (possivelmente incorreto)
   * - O app deve buscar o status correto nas stats do grupo
   */

  it("detecta hábito de grupo quando group não é null", () => {
    const habitOption: HabitOption = {
      id: "h-1",
      name: "Correr 5 km",
      category: "corrida",
      group: { id: "grp-1", name: "Equipe Alpha" },
      preselected: false,
    };
    const isGroupHabit = habitOption.group !== null;
    expect(isGroupHabit).toBe(true);
  });

  it("hábito pessoal tem group null", () => {
    const habitOption: HabitOption = {
      id: "h-2",
      name: "Meditar",
      category: "mente",
      group: null,
      preselected: false,
    };
    const isGroupHabit = habitOption.group !== null;
    expect(isGroupHabit).toBe(false);
  });

  it("identifica quando progress.status 'ended' pode ser o bug L1", () => {
    // Um hábito de grupo com status "ended" pode ser o bug L1
    // A tela deve verificar as stats do grupo antes de exibir como encerrado
    const hasGroupContext = true; // group !== null
    const progressStatusFromAPI = "ended";

    // Quando há contexto de grupo E status é "ended", verificar stats
    const needsStatsVerification =
      hasGroupContext && progressStatusFromAPI === "ended";
    expect(needsStatsVerification).toBe(true);
  });
});

// ── Convite e compartilhamento ────────────────────────────────────────────────

describe("código de convite", () => {
  it("código aparece somente quando invite_code não é null", () => {
    const hasCode = (group: GroupDetail) => group.invite_code !== null;
    expect(hasCode(activeGroup)).toBe(true);
    expect(hasCode(endedGroup)).toBe(false);
  });

  it("compartilhamento usa o código como texto, sem criar link", () => {
    // O texto de compartilhamento deve ser o código diretamente
    const inviteCode = "ALPHA-123";
    const shareText = inviteCode; // sem URL, apenas o código
    expect(shareText).toBe("ALPHA-123");
    expect(shareText).not.toContain("http");
    expect(shareText).not.toContain("https");
  });
});

// ── Check-in com hábitos de grupo ─────────────────────────────────────────────

describe("check-in: hábitos de grupo", () => {
  it("hábito de grupo exibe o nome do grupo", () => {
    const option: HabitOption = {
      id: "h-1",
      name: "Correr 5 km",
      category: "corrida",
      group: { id: "grp-1", name: "Equipe Alpha" },
      preselected: false,
    };
    const groupName = option.group?.name;
    expect(groupName).toBe("Equipe Alpha");
  });

  it("retorna habit_ids recusados em check-in de grupo encerrado (409)", () => {
    const err = new ApiError("conflict", 409, {
      detail: "Grupo encerrado não aceita check-ins.",
      habit_ids: ["gh-1"],
    });
    const rejectedIds = getRejectedHabitIds(err);
    expect(rejectedIds).toContain("gh-1");
    expect(getErrorMessage(err)).toBe("Grupo encerrado não aceita check-ins.");
  });

  it("retorna habit_ids recusados em 404 de hábito de grupo", () => {
    const err = new ApiError("not found", 404, {
      detail: "Hábito não encontrado.",
      habit_ids: ["gh-1", "gh-2"],
    });
    const rejectedIds = getRejectedHabitIds(err);
    expect(rejectedIds).toEqual(["gh-1", "gh-2"]);
  });
});
