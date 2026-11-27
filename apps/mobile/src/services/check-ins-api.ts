import { Platform } from "react-native";
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
 * Chaves que mostram a foto de um check-in: o detalhe, a lista da aba
 * Check-in, o histórico dos hábitos e o feed dos grupos.
 */
export function isAffectedByPhoto(key: unknown): boolean {
  if (typeof key === "string" && key.startsWith("/check-ins")) return true;
  return isAffectedByCheckIn(key);
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

// O nome e o tipo são só informativos: a API reconhece o formato pelos bytes.
async function photoFormData(uri: string): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === "web") {
    // O navegador precisa de um Blob de verdade
    const blob = await (await fetch(uri)).blob();
    form.append("photo", blob, "photo.jpg");
  } else {
    form.append("photo", {
      uri,
      name: "photo.jpg",
      type: "image/jpeg",
    } as unknown as Blob);
  }
  return form;
}

/**
 * Envia ou troca a foto. Só o autor, e só em check-in de hoje (São Paulo).
 * `uri` deve ser a imagem já preparada (JPEG de até 4 MB).
 */
export async function uploadCheckInPhoto(
  id: string,
  uri: string,
): Promise<CheckInPhotoPublic> {
  return request<CheckInPhotoPublic>(`/check-ins/${id}/photo`, {
    method: "PUT",
    body: await photoFormData(uri),
  });
}

/** Responde 204 mesmo se o check-in já estava sem foto. */
export function removeCheckInPhoto(id: string): Promise<void> {
  return request<void>(`/check-ins/${id}/photo`, { method: "DELETE" });
}
