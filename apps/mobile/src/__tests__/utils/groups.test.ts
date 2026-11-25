import type { MemberPublic } from "@/services/types/groups";
import {
  endsOnLabel,
  leavePlan,
  leaveResultMessage,
  membersLabel,
} from "@/utils/groups";

function member(
  username: string,
  role: MemberPublic["role"] = "member",
): MemberPublic {
  return {
    user_id: `u-${username}`,
    username,
    role,
    joined_at: "2026-11-17T12:00:00Z",
  };
}

describe("membersLabel", () => {
  it("uses the singular for one member", () => {
    expect(membersLabel(1)).toBe("1 membro");
    expect(membersLabel(4)).toBe("4 membros");
  });
});

describe("endsOnLabel", () => {
  it.each([
    [null, "active", "Sem data de fim"],
    ["2026-12-31", "active", "Termina em 31/12/2026"],
    ["2026-10-31", "ended", "Terminou em 31/10/2026"],
  ] as const)("%s %s → %s", (ends_on, status, label) => {
    expect(endsOnLabel({ ends_on, status })).toBe(label);
  });
});

describe("leavePlan", () => {
  it("deletes the group when the user is the only member", () => {
    const plan = leavePlan(
      { my_role: "admin", members: [member("caio", "admin")] },
      "u-caio",
    );

    expect(plan.buttonLabel).toBe("Sair e apagar o grupo");
  });

  it("names the oldest member who becomes admin", () => {
    const plan = leavePlan(
      {
        my_role: "admin",
        members: [member("caio", "admin"), member("joao"), member("pedro")],
      },
      "u-caio",
    );

    expect(plan.buttonLabel).toBe("Sair do grupo");
    expect(plan.warning).toBe("Você é o único admin. joao passa a ser admin.");
  });

  it.each([
    ["an admin with other admins", "admin" as const, "admin" as const],
    ["a regular member", "member" as const, "admin" as const],
  ])("just leaves as %s", (_case, myRole, otherRole) => {
    const plan = leavePlan(
      {
        my_role: myRole,
        members: [member("caio", myRole), member("ana", otherRole)],
      },
      "u-caio",
    );

    expect(plan.warning).toBe("Você deixa de ver o grupo e sai do ranking.");
  });
});

describe("leaveResultMessage", () => {
  const members = [member("caio", "admin"), member("joao")];

  it.each([
    [{ group_deleted: true, promoted_user_id: null }, "Grupo apagado."],
    [
      { group_deleted: false, promoted_user_id: "u-joao" },
      "joao agora é admin.",
    ],
    [{ group_deleted: false, promoted_user_id: null }, "Você saiu do grupo."],
  ])("%j → %s", (result, message) => {
    expect(leaveResultMessage(result, members)).toBe(message);
  });
});
