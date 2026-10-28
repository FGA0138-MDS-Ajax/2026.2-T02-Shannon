import { request, toQueryString } from "@/services/api";
import type {
  CheckIn,
  CheckInCategoriesResponse,
  CheckInCreate,
  CheckInUpdate,
  HabitOptionsPage,
  HabitOptionsParams,
} from "@/services/types/habits";

/** Categorias com hábitos elegíveis, em ordem alfabética e `outros` por último. */
export function listCheckInCategories(): Promise<CheckInCategoriesResponse> {
  return request<CheckInCategoriesResponse>("/check-ins/categories");
}

/**
 * Hábitos elegíveis de uma categoria (`category`) ou das outras
 * (`exclude_category`). Use `has_more` para saber se há próxima página.
 */
export function listHabitOptions(
  params: HabitOptionsParams,
): Promise<HabitOptionsPage> {
  return request<HabitOptionsPage>(
    `/check-ins/habit-options${toQueryString(params)}`,
  );
}

/**
 * Tudo ou nada: se algum hábito for recusado, nada é gravado e o erro traz os
 * `habit_ids` do motivo (ver getRejectedHabitIds).
 */
export function createCheckIn(body: CheckInCreate): Promise<CheckIn> {
  return request<CheckIn>("/check-ins", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getCheckIn(id: string): Promise<CheckIn> {
  return request<CheckIn>(`/check-ins/${id}`);
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
