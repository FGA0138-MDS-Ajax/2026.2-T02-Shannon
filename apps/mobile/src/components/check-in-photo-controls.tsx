import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActionRow, ErrorBanner } from "@/components/ui";
import { confirmAction } from "@/hooks/useAsyncAction";
import {
  type CheckInPhotoFile,
  removeCheckInPhoto,
  uploadCheckInPhoto,
} from "@/services/check-ins-api";
import { getPhotoErrorInfo, type PhotoErrorInfo } from "@/services/photo-errors";
import type {
  CheckIn,
  CheckInPhotoPublic,
} from "@/services/types/habits";
import {
  PhotoPermissionError,
  PhotoTooLargeError,
  pickPhoto,
  preparePhoto,
  type PhotoSource,
} from "@/utils/photo";

export interface CheckInPhotoControlsProps {
  checkIn: CheckIn;
  /** Chamado com a foto devolvida pelo PUT (ou `null` depois do DELETE). */
  onUpdated: (photo: CheckInPhotoPublic | null) => void;
  /** 404: o check-in sumiu; a tela volta para a lista. */
  onNotFound: () => void;
}

/**
 * Ações de foto do check-in: galeria, câmera e remoção. O chamador só monta
 * este componente para o autor e em check-in de hoje (São Paulo).
 */
export function CheckInPhotoControls({
  checkIn,
  onUpdated,
  onNotFound,
}: CheckInPhotoControlsProps) {
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState<PhotoErrorInfo | null>(null);
  // Prévia local: fica na tela se o upload falhar com 503/rede.
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [retryFile, setRetryFile] = useState<CheckInPhotoFile | null>(null);

  const handleError = (err: unknown) => {
    if (err instanceof PhotoTooLargeError || err instanceof PhotoPermissionError) {
      setPreviewUri(null);
      setRetryFile(null);
      setError({ message: err.message, action: "none" });
      return;
    }

    const info = getPhotoErrorInfo(err);
    if (info.action === "hide") setHidden(true);
    if (info.action === "back") onNotFound();
    if (info.action !== "retry") {
      setPreviewUri(null);
      setRetryFile(null);
    }
    setError(info);
  };

  const upload = async (file: CheckInPhotoFile) => {
    setBusy(true);
    setError(null);
    try {
      const photo = await uploadCheckInPhoto(checkIn.id, file);
      setPreviewUri(null);
      setRetryFile(null);
      onUpdated(photo);
    } catch (err: unknown) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const choose = async (source: PhotoSource) => {
    if (busy) return;
    setError(null);
    try {
      const asset = await pickPhoto(source);
      if (!asset) return;

      setBusy(true);
      const file = await preparePhoto(asset);
      setPreviewUri(file.uri);
      setRetryFile(file);
      setBusy(false);
      await upload(file);
    } catch (err: unknown) {
      setBusy(false);
      handleError(err);
    }
  };

  const retry = () => {
    if (retryFile) void upload(retryFile);
  };

  const remove = () => {
    confirmAction({
      title: "Remover foto",
      message: "A foto deste check-in será apagada. Deseja continuar?",
      confirmLabel: "Remover",
      destructive: true,
      onConfirm: async () => {
        setBusy(true);
        setError(null);
        try {
          await removeCheckInPhoto(checkIn.id);
          setPreviewUri(null);
          setRetryFile(null);
          onUpdated(null);
        } catch (err: unknown) {
          handleError(err);
        } finally {
          setBusy(false);
        }
      },
    });
  };

  if (hidden) return null;

  return (
    <View style={styles.container}>
      {error && (
        <ErrorBanner
          message={error.message}
          onRetry={
            error.action === "retry" && retryFile ? retry : undefined
          }
        />
      )}

      {previewUri && (
        <Image
          testID="check-in-photo-preview"
          source={{ uri: previewUri }}
          style={styles.preview}
          contentFit="cover"
        />
      )}

      <ActionRow
        testID="photo-library-button"
        icon="image"
        title={checkIn.photo ? "Trocar foto" : "Adicionar foto"}
        description="Escolher uma imagem da galeria"
        disabled={busy}
        onPress={() => choose("library")}
      />
      <ActionRow
        testID="photo-camera-button"
        icon="camera"
        title="Tirar foto"
        description="Abrir a câmera do aparelho"
        disabled={busy}
        onPress={() => choose("camera")}
      />
      {checkIn.photo && (
        <ActionRow
          testID="photo-remove-button"
          icon="trash-2"
          title="Remover foto"
          description="Apagar a foto deste check-in"
          destructive
          disabled={busy}
          onPress={remove}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  preview: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 16,
  },
});
