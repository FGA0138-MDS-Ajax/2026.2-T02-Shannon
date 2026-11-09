import { request } from "@/services/api";
import type { GoalInput, GoalPublic } from "@/services/types/habits";

/**
 * Define a meta (em hábito antigo) ou troca a atual. Envie a meta inteira.
 * Trocar período, quantidade ou dia de fechamento reinicia o streak e o
 * recorde: confirme com o usuário antes. Devolve só a meta; recarregue o
 * progresso depois.
 */
export function setHabitGoal(
  habitId: string,
  goal: GoalInput,
): Promise<GoalPublic> {
  return request<GoalPublic>(`/goals/habits/${habitId}/goal`, {
    method: "PUT",
    body: JSON.stringify(goal),
  });
}
