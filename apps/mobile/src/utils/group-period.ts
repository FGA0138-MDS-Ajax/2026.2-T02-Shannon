import { theme } from "@/config/theme";
import type {
  GroupHabitStatistics,
  GroupMember,
  RankingUser,
} from "@/services/types/groups";
import type { HabitProgress } from "@/services/types/habits";
import { plural } from "@/utils/text";

// Situação de cada integrante nos hábitos ativos do grupo no período atual
// da meta (dia, semana ou mês), montada a partir das estatísticas por hábito
// que a API calcula. "Cumprida" é a meta do período já batida.

export interface MemberHabitPeriod {
  habitId: string;
  name: string;
  progress: HabitProgress;
  done: boolean;
}

export interface MemberPeriod {
  user: RankingUser;
  habits: MemberHabitPeriod[];
  done: number;
  total: number;
}

export interface GroupPeriod {
  done: number;
  total: number;
  percent: number;
}

export interface HabitPeriod {
  habitId: string;
  name: string;
  /** Integrantes que já cumpriram a meta, de quantos têm o hábito */
  done: number;
  total: number;
}

/** Integrantes do mais antigo ao mais novo no grupo */
function byJoinOrder(members: GroupMember[]): GroupMember[] {
  return [...members].sort((a, b) => a.joined_at.localeCompare(b.joined_at));
}

/**
 * Uma linha por integrante, na ordem de entrada no grupo: a API ordena as
 * estatísticas pela sequência, e a roda não pode trocar as fatias de lugar.
 */
export function membersPeriod(
  stats: GroupHabitStatistics[],
  groupMembers: GroupMember[],
): MemberPeriod[] {
  const byUser = new Map<string, MemberPeriod>();
  for (const habitStats of stats) {
    for (const member of habitStats.members) {
      let row = byUser.get(member.user.id);
      if (!row) {
        row = { user: member.user, habits: [], done: 0, total: 0 };
        byUser.set(member.user.id, row);
      }
      const done = member.progress.status === "completed";
      row.habits.push({
        habitId: habitStats.habit_id,
        name: habitStats.name,
        progress: member.progress,
        done,
      });
      row.total += 1;
      if (done) row.done += 1;
    }
  }
  // Quem saiu do grupo e ainda aparece nas estatísticas vai para o fim
  const order = new Map(
    byJoinOrder(groupMembers).map((member, index) => [member.user_id, index]),
  );
  const position = (userId: string) => order.get(userId) ?? order.size;
  return [...byUser.values()].sort(
    (a, b) => position(a.user.id) - position(b.user.id),
  );
}

/** Parte das metas já cumprida, de 0 a 1 */
export function memberRatio({ done, total }: MemberPeriod): number {
  return total === 0 ? 0 : done / total;
}

export function groupPeriod(members: MemberPeriod[]): GroupPeriod {
  const done = members.reduce((sum, member) => sum + member.done, 0);
  const total = members.reduce((sum, member) => sum + member.total, 0);
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

/** Quantos integrantes cumpriram a meta de cada hábito, na ordem da API */
export function habitsPeriod(stats: GroupHabitStatistics[]): HabitPeriod[] {
  return stats.map((habitStats) => ({
    habitId: habitStats.habit_id,
    name: habitStats.name,
    done: habitStats.members.filter(
      (member) => member.progress.status === "completed",
    ).length,
    total: habitStats.members.length,
  }));
}

/** `"8 de 12 metas cumpridas no grupo"` */
export function groupPeriodLabel({ done, total }: GroupPeriod): string {
  return `${done} de ${plural(total, "meta cumprida", "metas cumpridas")} no grupo`;
}

/** `"2 cumpridas · 1 pendente"` */
export function memberPeriodLabel({ done, total }: MemberPeriod): string {
  return `${plural(done, "cumprida", "cumpridas")} · ${plural(total - done, "pendente", "pendentes")}`;
}

/** Progresso de um integrante num hábito (para os detalhes do feed) */
export function findMemberProgress(
  members: MemberPeriod[],
  userId: string,
  habitId: string,
): HabitProgress | undefined {
  return members
    .find((member) => member.user.id === userId)
    ?.habits.find((habit) => habit.habitId === habitId)?.progress;
}

/**
 * Cor de cada integrante pela ordem de entrada no grupo, para a mesma pessoa
 * ter a mesma cor na roda, no ranking e na lista de integrantes.
 */
export function memberColors(members: GroupMember[]) {
  const colors = new Map(
    byJoinOrder(members).map((member, index) => [
      member.user_id,
      theme.memberColors[index % theme.memberColors.length],
    ]),
  );
  return (userId: string) => colors.get(userId) ?? theme.colors.subtle;
}
