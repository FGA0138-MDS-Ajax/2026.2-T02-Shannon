import { request, toQueryString } from "@/services/api";
import type {
  CheckIn,
  CheckInCategoriesResponse,
  CheckInCreate,
  CheckInCreated,
  CheckInsPage,
  CheckInUpdate,
  HabitOptionsPage,
  HabitOptionsParams,
  ListCheckInsParams,
} from "@/services/types/habits";

/** Chaves do SWR das telas de check-in: a própria rota de cada GET. */
export const checkInKeys = {
  list: (params: ListCheckInsParams = {}) =>
    `/check-ins${toQueryString(params)}`,
  categories: "/check-ins/categories",
  habitOptions: (params: HabitOptionsParams) =>
    `/check-ins/habit-options${toQueryString(params)}`,
  detail: (id: string) => `/check-ins/${id}`,
};

/**
 * Lista os check-ins do usuário logado agrupados por dia, do mais recente ao
 * mais antigo. Cada item de `items` é um objeto `{ [data]: CheckIn[] }`.
 */
export function listUserCheckIns(
  params: ListCheckInsParams = {},
): Promise<CheckInsPage> {
  return request<CheckInsPage>(checkInKeys.list(params));
}

/** Categorias com hábitos elegíveis, em ordem alfabética e `outros` por último. */
export function listCheckInCategories(): Promise<CheckInCategoriesResponse> {
  return request<CheckInCategoriesResponse>(checkInKeys.categories);
}

/**
 * Hábitos elegíveis de uma categoria (`category`) ou das outras
 * (`exclude_category`). Use `has_more` para saber se há próxima página.
 */
export function listHabitOptions(
  params: HabitOptionsParams,
): Promise<HabitOptionsPage> {
  return request<HabitOptionsPage>(checkInKeys.habitOptions(params));
}

/**
 * Tudo ou nada: se algum hábito for recusado, nada é gravado e o erro traz os
 * `habit_ids` do motivo (ver getRejectedHabitIds).
 */
export function createCheckIn(body: CheckInCreate): Promise<CheckInCreated> {
  return request<CheckInCreated>("/check-ins", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getCheckIn(id: string): Promise<CheckIn> {
  return request<CheckIn>(checkInKeys.detail(id));
}

/** Envie só os campos alterados. `null` apaga descrição e duração. */
export function updateCheckIn(
  id: string,
  changes: CheckInUpdate,
): Promise<CheckIn> {
  return request<CheckIn>(`/check-ins/${id}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export function deleteCheckIn(id: string): Promise<void> {
  return request<void>(`/check-ins/${id}`, { method: "DELETE" });
}
