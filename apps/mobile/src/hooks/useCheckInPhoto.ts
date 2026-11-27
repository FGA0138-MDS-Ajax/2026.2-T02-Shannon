import { router } from "expo-router";
import { useState, useTransition } from "react";
import { Alert } from "react-native";
import { useSWRConfig } from "swr";
import { ApiError } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import {
  isAffectedByPhoto,
  removeCheckInPhoto,
  uploadCheckInPhoto,
} from "@/services/check-ins-api";
import {
  localPhotoErrorMessage,
  PhotoError,
  type PhotoSource,
  type PreparedPhoto,
  pickPhoto,
  preparePhoto,
} from "@/utils/check-in-photo";

/** Pergunta de onde vem a foto: galeria ou câmera. */
export function askPhotoSource(onChoose: (source: PhotoSource) => void) {
  Alert.alert("Foto do check-in", undefined, [
    { text: "Escolher da galeria", onPress: () => onChoose("library") },
    { text: "Tirar foto", onPress: () => onChoose("camera") },
    { text: "Cancelar", style: "cancel" },
  ]);
}

/**
 * Adicionar, trocar e remover a foto no detalhe do check-in. Depois de cada
 * mudança, recarrega o detalhe e as listas que mostram a miniatura.
 */
export function useCheckInPhoto(checkInId: string) {
  const { mutate } = useSWRConfig();
  const [busy, startTransition] = useTransition();
  // Foto já preparada, mostrada enquanto envia e mantida se der para tentar de novo
  const [pending, setPending] = useState<PreparedPhoto | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  // 403/409: a API não deixa mais mexer (outro autor ou o dia virou)
  const [locked, setLocked] = useState(false);

  const handleError = (err: unknown) => {
    const message =
      err instanceof PhotoError ? err.message : getErrorMessage(err);
    const status = err instanceof ApiError ? err.status : null;

    if (status === 403 || status === 409) setLocked(true);
    if (status === 404) router.back();

    // Falha no armazenamento ou na rede: o mesmo arquivo pode ir de novo
    const retryable =
      status === null ? !(err instanceof PhotoError) : status >= 500;
    setCanRetry(retryable);
    if (!retryable) setPending(null);

    Alert.alert("Não foi possível salvar a foto", message);
  };

  const send = (photo: PreparedPhoto) =>
    startTransition(async () => {
      setPending(photo);
      setCanRetry(false);
      try {
        await uploadCheckInPhoto(checkInId, photo.uri);
        await mutate(isAffectedByPhoto);
        setPending(null);
      } catch (err: unknown) {
        handleError(err);
      }
    });

  const pickAndSend = (source: PhotoSource) =>
    startTransition(async () => {
      try {
        const picked = await pickPhoto(source);
        if (picked) send(await preparePhoto(picked));
      } catch (err: unknown) {
        Alert.alert(
          "Não foi possível usar a foto",
          localPhotoErrorMessage(err),
        );
      }
    });

  const choose = () => askPhotoSource(pickAndSend);

  const retry = () => {
    if (pending) send(pending);
  };

  const remove = () =>
    Alert.alert("Remover foto", "A foto sai deste check-in.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () =>
          startTransition(async () => {
            try {
              await removeCheckInPhoto(checkInId);
              await mutate(isAffectedByPhoto);
            } catch (err: unknown) {
              handleError(err);
            }
          }),
      },
    ]);

  return { busy, pending, canRetry, locked, choose, retry, remove };
}
