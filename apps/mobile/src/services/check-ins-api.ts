import { request, toQueryString } from "@/services/api";
import { isGroupDataKey } from "@/services/groups-api";
import { isHomeDataKey } from "@/services/statistics-api";
import type {
  CheckIn,
  CheckInCategoriesResponse,
  CheckInCreate,
  CheckInCreated,
  CheckInPhotoPublic,
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
 * Chaves que um check-in novo muda: a Home, os hábitos (progresso da meta e
 * lista de check-ins de cada um) e as telas de grupo (roda, feed e ranking). Depois de
 * criar, use `mutate(isAffectedByCheckIn)`.
 */
export function isAffectedByCheckIn(key: unknown): boolean {
  const isHabitKey =
    typeof key === "string" &&
    (key.startsWith("/habits/") || key.startsWith("/goals/habits/"));
  return isHomeDataKey(key) || isGroupDataKey(key) || isHabitKey;
}

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

/**
 * Arquivo pronto para o upload. No celular o `FormData` recebe
 * `{ uri, name, type }`; na web, o `File` devolvido pelo seletor.
 */
export interface CheckInPhotoFile {
  uri: string;
  name: string;
  type: string;
  file?: Blob;
}

/**
 * Envia ou substitui a foto do check-in. O campo multipart é `photo` e o
 * `Content-Type` não é definido na mão: o runtime precisa gerar o boundary.
 */
export function uploadCheckInPhoto(
  id: string,
  photo: CheckInPhotoFile,
): Promise<CheckInPhotoPublic> {
  const form = new FormData();
  const value = photo.file ?? {
    uri: photo.uri,
    name: photo.name,
    type: photo.type,
  };
  // O tipo do React Native para o campo nativo não é o `Blob` do DOM.
  form.append("photo", value as unknown as Blob);

  return request<CheckInPhotoPublic>(`/check-ins/${id}/photo`, {
    method: "PUT",
    body: form,
  });
}

/** Remove a foto. A API responde 204 sem corpo, mesmo se não houver foto. */
export function removeCheckInPhoto(id: string): Promise<void> {
  return request<void>(`/check-ins/${id}/photo`, { method: "DELETE" });
}
