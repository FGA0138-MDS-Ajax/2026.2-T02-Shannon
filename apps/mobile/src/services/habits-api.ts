import { request, toQueryString } from "@/services/api";
import type {
  CheckIn,
  Habit,
  HabitCreate,
  HabitStatus,
  HabitUpdate,
  HabitWithProgress,
} from "@/services/types/habits";

/**
 * Chaves do SWR das telas de hábito. Cada GET usa a própria rota como chave,
 * então `useSWR(habitKeys.detail(id), request)` equivale a `getHabit(id)`.
 */
export const habitKeys = {
  list: (status?: HabitStatus) => `/habits${toQueryString({ status })}`,
  detail: (id: string) => `/habits/${id}`,
  checkIns: (id: string) => `/habits/${id}/check-ins`,
  progress: (id: string) => `/goals/habits/${id}/progress`,
};

/** Hábitos do usuário logado, do mais novo para o mais antigo. */
export function listHabits(status?: HabitStatus): Promise<HabitWithProgress[]> {
  return request<HabitWithProgress[]>(habitKeys.list(status));
}

export function createHabit(body: HabitCreate): Promise<Habit> {
  return request<Habit>("/habits", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getHabit(id: string): Promise<Habit> {
  return request<Habit>(habitKeys.detail(id));
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
  return request<CheckIn[]>(habitKeys.checkIns(id));
}
