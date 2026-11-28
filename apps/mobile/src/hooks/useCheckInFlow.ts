import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
  type CheckInFieldErrors,
  type CheckInFieldValues,
  validateCheckInFields,
} from "@/components/forms/check-in-fields";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { request } from "@/services/api";
import {
  getErrorMessage,
  getFormErrors,
  getRejectedHabitIds,
} from "@/services/api-errors";
import {
  type CheckInPhotoFile,
  checkInKeys,
  createCheckIn,
  isAffectedByCheckIn,
  listHabitOptions,
  uploadCheckInPhoto,
} from "@/services/check-ins-api";
import { getPhotoErrorInfo } from "@/services/photo-errors";
import type {
  CheckInCategoriesResponse,
  CheckInCreate,
  HabitCategory,
  HabitOptionsPage,
} from "@/services/types/habits";
import {
  type CheckInProgressItem,
  matchCheckInProgress,
} from "@/utils/check-in-progress";
import { pickPhoto, preparePhoto, type PhotoSource } from "@/utils/photo";

export type CheckInStep = "categories" | "habits" | "details";

// Limite de hábitos por check-in aceito pela API
export const MAX_HABITS = 20;
// "Ver mais": hábitos das outras categorias, de 3 em 3
const EXTRA_PAGE_SIZE = 3;

const EMPTY_FIELDS: CheckInFieldValues = {
  title: "",
  description: "",
  duration: "",
};

/** Hábitos recusados no último envio e o motivo dado pela API */
export interface CheckInRejection {
  ids: Set<string>;
  reason: string;
}

export interface CheckInFlowParams {
  /** Abre o check-in criado quando não há progresso de meta para resumir */
  onOpenCheckIn: (id: string) => void;
}

/**
 * Estado do fluxo de check-in em três etapas: categoria → hábitos → detalhes.
 * Depois do envio, `created` traz o progresso de cada hábito com meta.
 */
export function useCheckInFlow({ onOpenCheckIn }: CheckInFlowParams) {
  const { mutate: globalMutate } = useSWRConfig();

  const [step, setStep] = useState<CheckInStep>("categories");
  const [category, setCategory] = useState<HabitCategory | null>(null);
  // O `preselected` é a sugestão da API; `selected` é o que a pessoa decidiu
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [extraPage, setExtraPage] = useState(0);
  const [hasMoreExtra, setHasMoreExtra] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Aviso em cima da lista (limite, falha no "Ver mais", recusa)
  const [notice, setNotice] = useState<string | null>(null);
  const [rejection, setRejection] = useState<CheckInRejection | null>(null);
  // Categoria cujos sugeridos já foram aplicados: a sugestão vale uma vez só,
  // senão desmarcar o último sugerido o marcaria de novo no render seguinte
  const [preselectedFor, setPreselectedFor] = useState<HabitCategory | null>(
    null,
  );

  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [fieldErrors, setFieldErrors] = useState<CheckInFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Foto escolhida na etapa de detalhes: enviada só depois do POST /check-ins
  const [photo, setPhoto] = useState<CheckInPhotoFile | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoPicking, setPhotoPicking] = useState(false);
  // O GET do detalhe não traz o progresso: o resumo é mostrado aqui
  const [created, setCreated] = useState<{
    id: string;
    items: CheckInProgressItem[];
  } | null>(null);
  // Falha no upload depois do check-in criado: o resumo avisa e o detalhe
  // permite tentar de novo sem desfazer o check-in.
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);

  // ── Dados ─────────────────────────────────────────────────────────────────
  const categoriesQuery = useSWR<CheckInCategoriesResponse>(
    checkInKeys.categories,
    request,
  );
  const { mutate: refreshCategories } = categoriesQuery;
  const categories = categoriesQuery.data?.categories ?? null;

  // A tela continua montada ao navegar: um hábito criado agora tem que aparecer
  useRefreshOnFocus(refreshCategories);

  const optionsQuery = useSWR<HabitOptionsPage>(
    category ? checkInKeys.habitOptions({ category }) : null,
    request,
    // Não repõe os itens acumulados pelo "Ver mais"
    { revalidateOnFocus: false },
  );
  // null = carregando; array = carregou (pode estar vazio)
  const options = optionsQuery.isLoading
    ? null
    : (optionsQuery.data?.items ?? null);

  const loadError = category ? optionsQuery.error : categoriesQuery.error;

  // Pré-seleciona os sugeridos pela API na primeira carga da categoria
  const rawItems = optionsQuery.data?.items;
  if (rawItems && category && preselectedFor !== category) {
    setPreselectedFor(category);
    const suggested = rawItems.filter((habit) => habit.preselected);
    if (suggested.length > 0 && selected.size === 0) {
      setSelected(new Set(suggested.map((habit) => habit.id)));
    }
  }

  // ── Navegação entre etapas ────────────────────────────────────────────────
  const resetSelection = () => {
    setSelected(new Set());
    setExtraPage(0);
    setHasMoreExtra(false);
    setLoadingMore(false);
    setNotice(null);
    setRejection(null);
    setPreselectedFor(null);
  };

  const openCategory = (name: HabitCategory) => {
    resetSelection();
    setStep("habits");
    setCategory(name);
    // Antes do primeiro "Ver mais", basta existir outra categoria elegível
    setHasMoreExtra(categories?.some((item) => item.name !== name) ?? false);
  };

  const backToCategories = () => {
    resetSelection();
    setStep("categories");
    setCategory(null);
  };

  const retryLoad = () => {
    if (category) optionsQuery.mutate();
    else refreshCategories();
  };

  // ── Seleção ───────────────────────────────────────────────────────────────
  const loadMore = async () => {
    if (!category || loadingMore) return;
    const nextPage = extraPage + 1;
    setLoadingMore(true);
    setNotice(null);
    try {
      const page = await listHabitOptions({
        exclude_category: category,
        page: nextPage,
        page_size: EXTRA_PAGE_SIZE,
      });
      // Acrescenta ao cache do SWR sem revalidar do servidor
      await optionsQuery.mutate(
        (prev) =>
          prev ? { ...prev, items: [...prev.items, ...page.items] } : page,
        { revalidate: false },
      );
      setExtraPage(nextPage);
      setHasMoreExtra(page.has_more);
    } catch (err: unknown) {
      setNotice(getErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleHabit = (id: string) => {
    setNotice(null);
    if (selected.has(id)) {
      const next = new Set(selected);
      next.delete(id);
      setSelected(next);
      return;
    }
    if (selected.size >= MAX_HABITS) {
      setNotice(`Você pode marcar no máximo ${MAX_HABITS} hábitos.`);
      return;
    }
    setSelected(new Set(selected).add(id));
  };

  // ── Foto ──────────────────────────────────────────────────────────────────
  const selectPhoto = async (source: PhotoSource) => {
    if (photoPicking) return;
    setPhotoError(null);
    try {
      const asset = await pickPhoto(source);
      if (!asset) return;

      setPhotoPicking(true);
      const file = await preparePhoto(asset);
      setPhoto(file);
      setPhotoPreview(file.uri);
    } catch (err: unknown) {
      setPhotoError(
        err instanceof Error ? err.message : getErrorMessage(err),
      );
    } finally {
      setPhotoPicking(false);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    setPhotoError(null);
  };

  // ── Envio ─────────────────────────────────────────────────────────────────
  const submit = async () => {
    if (submitting) return;
    setFormError(null);
    const { errors, valid } = validateCheckInFields(fields);
    setFieldErrors(errors ?? {});
    if (!valid) return;

    // O Set já garante que não há ids repetidos
    const body: CheckInCreate = {
      title: valid.title,
      habit_ids: [...selected],
    };
    if (valid.description) body.description = valid.description;
    if (valid.duration) body.duration = valid.duration;

    try {
      setSubmitting(true);
      setRejection(null);
      setPhotoNotice(null);
      const checkIn = await createCheckIn(body);
      // A Home continua montada por baixo: recarrega o painel já agora
      globalMutate(isAffectedByCheckIn);

      // O check-in já existe: uma falha no upload não pode desfazê-lo.
      if (photo) {
        try {
          await uploadCheckInPhoto(checkIn.id, photo);
        } catch (err: unknown) {
          setPhotoNotice(getPhotoErrorInfo(err).message);
        }
        setPhoto(null);
        setPhotoPreview(null);
        setPhotoError(null);
      }

      // Junta nome e progresso antes de zerar a categoria (e as opções)
      const chosen = (options ?? []).filter((habit) => selected.has(habit.id));
      const items = matchCheckInProgress(chosen, checkIn.progress);

      backToCategories();
      setFields(EMPTY_FIELDS);
      // Nenhum hábito com meta: não há o que resumir, segue para o detalhe
      if (items.length === 0) onOpenCheckIn(checkIn.id);
      else setCreated({ id: checkIn.id, items });
    } catch (err: unknown) {
      // Recusa (404, 403 ou 409): nada foi gravado. Volta para a lista com os
      // recusados destacados, mantendo o resto da seleção
      const rejectedIds = getRejectedHabitIds(err);
      if (rejectedIds.length > 0) {
        const reason = getErrorMessage(err);
        setRejection({ ids: new Set(rejectedIds), reason });
        setNotice(reason);
        setStep("habits");
        return;
      }
      const { fieldErrors: apiErrors, formError: bodyError } =
        getFormErrors(err);
      const { habit_ids: habitIdsError, ...apiFieldErrors } = apiErrors;
      setFieldErrors(apiFieldErrors);
      setFormError(bodyError ?? habitIdsError ?? null);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    step,
    setStep,
    category,
    categories,
    categoriesLoading: categoriesQuery.isLoading,
    options,
    loadError: loadError ? getErrorMessage(loadError) : null,
    retryLoad,
    openCategory,
    backToCategories,
    selected,
    toggleHabit,
    hasMoreExtra,
    loadingMore,
    loadMore,
    notice,
    rejection,
    fields,
    setFields,
    fieldErrors,
    formError,
    submitting,
    submit,
    photoPreview,
    photoError,
    photoPicking,
    selectPhoto,
    removePhoto,
    photoNotice,
    created,
  };
}
