import { request, toQueryString } from "@/services/api";
import type {
  CheckIn,
  Habit,
  HabitCreate,
  HabitStatus,
  HabitUpdate,
} from "@/services/types/habits";

/** Hábitos do usuário logado, do mais novo para o mais antigo. */
export function listHabits(status?: HabitStatus): Promise<Habit[]> {
  return request<Habit[]>(`/habits${toQueryString({ status })}`);
}

export function createHabit(body: HabitCreate): Promise<Habit> {
  return request<Habit>("/habits", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getHabit(id: string): Promise<Habit> {
  return request<Habit>(`/habits/${id}`);
}

/** Envie só os campos alterados: o que ficar de fora não muda. */
export function updateHabit(id: string, changes: HabitUpdate): Promise<Habit> {
  return request<Habit>(`/habits/${id}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export function finishHabit(id: string): Promise<Habit> {
  return request<Habit>(`/habits/${id}/finish`, { method: "POST" });
}

/** Os check-ins do hábito continuam existindo depois da exclusão. */
export function deleteHabit(id: string): Promise<void> {
  return request<void>(`/habits/${id}`, { method: "DELETE" });
}

/** Histórico do hábito, do mais recente ao mais antigo. Sem paginação. */
export function listHabitCheckIns(id: string): Promise<CheckIn[]> {
  return request<CheckIn[]>(`/habits/${id}/check-ins`);
}
