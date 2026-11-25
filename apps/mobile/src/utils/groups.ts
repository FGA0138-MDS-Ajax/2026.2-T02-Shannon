import type {
  GroupDetail,
  LeaveResult,
  MemberPublic,
  RankingCriterion,
} from "@/services/types/groups";
import { formatDate, parseApiDate } from "@/utils/date";

export const criterionLabels: Record<RankingCriterion, string> = {
  check_ins: "Ranking por dias com check-in",
  goals: "Ranking por metas batidas",
};

export function membersLabel(count: number): string {
  return count === 1 ? "1 membro" : `${count} membros`;
}

export function endsOnLabel({
  ends_on,
  status,
}: Pick<GroupDetail, "ends_on" | "status">): string {
  if (!ends_on) return "Sem data de fim";
  const end = formatDate(parseApiDate(ends_on));
  return status === "ended" ? `Terminou em ${end}` : `Termina em ${end}`;
}

export interface LeavePlan {
  buttonLabel: string;
  warning: string;
}

// O texto do "Sair" depende de quem fica no grupo: o último apaga o grupo e,
// se sair o único admin, o integrante mais antigo vira admin.
export function leavePlan(
  group: Pick<GroupDetail, "members" | "my_role">,
  userId: string | undefined,
): LeavePlan {
  const others = group.members.filter((member) => member.user_id !== userId);

  if (others.length === 0) {
    return {
      buttonLabel: "Sair e apagar o grupo",
      warning:
        "Você é o único integrante. O grupo e os hábitos dele serão apagados.",
    };
  }

  const otherAdmins = others.filter((member) => member.role === "admin");
  if (group.my_role === "admin" && otherAdmins.length === 0) {
    // A API devolve os membros do mais antigo para o mais novo
    return {
      buttonLabel: "Sair do grupo",
      warning: `Você é o único admin. ${others[0].username} passa a ser admin.`,
    };
  }

  return {
    buttonLabel: "Sair do grupo",
    warning: "Você deixa de ver o grupo e sai do ranking.",
  };
}

export function leaveResultMessage(
  result: LeaveResult,
  members: MemberPublic[],
): string {
  if (result.group_deleted) return "Grupo apagado.";
  const promoted = members.find(
    (member) => member.user_id === result.promoted_user_id,
  );
  if (promoted) return `${promoted.username} agora é admin.`;
  return "Você saiu do grupo.";
}
