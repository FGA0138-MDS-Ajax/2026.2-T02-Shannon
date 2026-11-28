import { router, useLocalSearchParams } from "expo-router";
import { useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import useSWR from "swr";
import { CheckInPhoto } from "@/components/check-in-photo";
import { CheckInPhotoControls } from "@/components/check-in-photo-controls";
import {
  ActionRow,
  BackButton,
  QueryState,
  Screen,
  Section,
} from "@/components/ui";
import { theme } from "@/config/theme";
import { confirmAction, useAsyncAction } from "@/hooks/useAsyncAction";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { useSession } from "@/hooks/useSession";
import { request } from "@/services/api";
import { checkInKeys, deleteCheckIn } from "@/services/check-ins-api";
import type { CheckIn, CheckInPhotoPublic } from "@/services/types/habits";
import { formatDateTime } from "@/utils/date";
import { formatDuration } from "@/utils/duration";
import { canManageCheckInPhoto } from "@/utils/photo-rules";

export default function CheckInDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const { busy, run } = useAsyncAction();
  // A URL assinada vale 30 min. Se a imagem falhar, renova uma vez por
  // montagem com um GET novo; se voltar `photo: null`, a imagem some sem loop.
  const renewedPhoto = useRef(false);
  const {
    data: checkIn,
    error,
    mutate: refreshCheckIn,
  } = useSWR<CheckIn>(checkInKeys.detail(id), request);

  useRefreshOnFocus(refreshCheckIn);

  const handlePhotoError = () => {
    if (renewedPhoto.current) return;
    renewedPhoto.current = true;
    void refreshCheckIn();
  };

  const handlePhotoUpdated = (photo: CheckInPhotoPublic | null) => {
    if (!checkIn) return;
    void refreshCheckIn({ ...checkIn, photo }, { revalidate: false });
  };

  const handleDelete = () =>
    confirmAction({
      title: "Excluir check-in",
      message: "Essa ação não pode ser desfeita. Deseja continuar?",
      confirmLabel: "Excluir",
      destructive: true,
      onConfirm: () =>
        run("Não foi possível excluir", async () => {
          await deleteCheckIn(id);
          router.back();
        }),
    });

  const renderContent = (checkIn: CheckIn) => {
    const isOwner = checkIn.user_id === user?.id;
    const canManagePhoto = canManageCheckInPhoto(checkIn, user?.id);

    return (
      <ScrollView>
        <Text style={styles.title}>{checkIn.title}</Text>
        <Text style={styles.details}>
          {formatDateTime(checkIn.created_at)}
          {checkIn.duration ? ` · ${formatDuration(checkIn.duration)}` : ""}
        </Text>

        {checkIn.photo && (
          <CheckInPhoto
            checkInId={checkIn.id}
            photo={checkIn.photo}
            variant="full"
            testID="check-in-photo-full"
            onError={handlePhotoError}
          />
        )}

        {checkIn.description && (
          <Section title="Descrição">
            <Text style={styles.description}>{checkIn.description}</Text>
          </Section>
        )}

        {canManagePhoto && (
          <View style={styles.photoActions}>
            <CheckInPhotoControls
              checkIn={checkIn}
              onUpdated={handlePhotoUpdated}
              onNotFound={() => router.back()}
            />
          </View>
        )}

        {isOwner && (
          <View style={styles.actions}>
            <ActionRow
              icon="edit-2"
              title="Editar"
              description="Título, descrição e duração"
              disabled={busy}
              onPress={() => router.push(`/check-ins/${checkIn.id}/edit`)}
            />
            <ActionRow
              icon="trash-2"
              title="Excluir check-in"
              description="Apagar este registro permanentemente"
              destructive
              disabled={busy}
              onPress={handleDelete}
            />
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <Screen>
      <BackButton />
      <QueryState
        data={checkIn}
        error={error}
        onRetry={() => refreshCheckIn()}
        notFoundMessage="Check-in não encontrado."
      >
        {renderContent}
      </QueryState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: 8,
    marginBottom: 4,
    fontFamily: theme.font.bold,
    fontSize: 26,
    color: theme.colors.text,
  },
  details: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: theme.colors.muted,
  },
  description: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: theme.colors.label,
    lineHeight: 22,
  },
  photoActions: {
    marginTop: 24,
  },
  actions: {
    marginTop: 24,
    marginBottom: 8,
    gap: 8,
  },
});
