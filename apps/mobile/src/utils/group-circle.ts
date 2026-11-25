import type { GroupHabitStatistics, UserRef } from "@/services/types/groups";
import type { HabitProgress } from "@/services/types/habits";

// Dados do círculo de participantes: quanto cada pessoa já fez hoje dos
// hábitos do grupo. Tudo sai das estatísticas que a API calcula.

export interface MemberHabitToday {
  habitId: string;
  name: string;
  progress: HabitProgress;
  done: boolean;
}

export interface MemberToday {
  user: UserRef;
  habits: MemberHabitToday[];
  done: number;
  total: number;
}

/** Junta as estatísticas de cada hábito em uma linha por integrante, na ordem da API */
export function membersToday(stats: GroupHabitStatistics[]): MemberToday[] {
  const byUser = new Map<string, MemberToday>();
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
  return [...byUser.values()];
}

/** Parte da meta do dia já feita, de 0 a 1 */
export function memberRatio({ done, total }: MemberToday): number {
  return total === 0 ? 0 : done / total;
}

export interface GroupToday {
  done: number;
  total: number;
  percent: number;
}

export function groupToday(members: MemberToday[]): GroupToday {
  const done = members.reduce((sum, member) => sum + member.done, 0);
  const total = members.reduce((sum, member) => sum + member.total, 0);
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

/** `"8 de 12 hábitos concluídos no grupo"` */
export function groupTodayLabel({ done, total }: GroupToday): string {
  return `${done} de ${total} ${total === 1 ? "hábito concluído" : "hábitos concluídos"} no grupo`;
}

/** `"2 concluídos · 1 a fazer hoje"` */
export function memberTodayLabel({ done, total }: MemberToday): string {
  const doneText = done === 1 ? "1 concluído" : `${done} concluídos`;
  return `${doneText} · ${total - done} a fazer hoje`;
}
