import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import useSWR from "swr";
import CheckInPhoto from "@/components/check-in-photo";
import {
  ActionRow,
  BackButton,
  QueryState,
  Screen,
  Section,
} from "@/components/ui";
import { theme } from "@/config/theme";
import { confirmAction, useAsyncAction } from "@/hooks/useAsyncAction";
import { useCheckInPhoto } from "@/hooks/useCheckInPhoto";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { useSession } from "@/hooks/useSession";
import { request } from "@/services/api";
import { checkInKeys, deleteCheckIn } from "@/services/check-ins-api";
import type { CheckIn } from "@/services/types/habits";
import { canEditPhoto } from "@/utils/check-in-photo";
import { formatDateTime } from "@/utils/date";
import { formatDuration } from "@/utils/duration";

export default function CheckInDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const { busy, run } = useAsyncAction();
  const {
    data: checkIn,
    error,
    mutate: refreshCheckIn,
  } = useSWR<CheckIn>(checkInKeys.detail(id), request);

  const photoActions = useCheckInPhoto(id);

  useRefreshOnFocus(refreshCheckIn);

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

  const renderPhoto = (checkIn: CheckIn) => {
    // Enquanto envia (ou se der para tentar de novo), mostra a foto escolhida
    if (photoActions.pending) {
      return (
        <View style={styles.photo}>
          <Image
            source={{ uri: photoActions.pending.uri }}
            contentFit="cover"
            style={styles.preview}
          />
          {photoActions.busy && (
            <View style={styles.previewOverlay}>
              <ActivityIndicator color={theme.colors.surface} />
            </View>
          )}
        </View>
      );
    }
    if (!checkIn.photo) return null;
    return (
      <View style={styles.photo}>
        <CheckInPhoto
          photo={checkIn.photo}
          variant="full"
          onExpired={() => refreshCheckIn()}
        />
      </View>
    );
  };

  const renderPhotoActions = (checkIn: CheckIn) => {
    if (photoActions.locked || !canEditPhoto(checkIn, user?.id)) return null;
    const { busy, canRetry, choose, retry, remove } = photoActions;

    if (canRetry) {
      return (
        <ActionRow
          icon="refresh-cw"
          title="Tentar enviar de novo"
          description="A foto escolhida ainda não foi salva"
          disabled={busy}
          onPress={retry}
        />
      );
    }
    if (!checkIn.photo) {
      return (
        <ActionRow
          icon="camera"
          title="Adicionar foto"
          description="Da galeria ou da câmera, só no dia do check-in"
          disabled={busy}
          onPress={choose}
        />
      );
    }
    return (
      <>
        <ActionRow
          icon="image"
          title="Trocar foto"
          description="A foto atual é substituída"
          disabled={busy}
          onPress={choose}
        />
        <ActionRow
          icon="image-off"
          title="Remover foto"
          description="O check-in fica sem foto"
          destructive
          disabled={busy}
          onPress={remove}
        />
      </>
    );
  };

  const renderContent = (checkIn: CheckIn) => {
    const isOwner = checkIn.user_id === user?.id;

    return (
      <ScrollView>
        <Text style={styles.title}>{checkIn.title}</Text>
        <Text style={styles.details}>
          {formatDateTime(checkIn.created_at)}
          {checkIn.duration ? ` · ${formatDuration(checkIn.duration)}` : ""}
        </Text>

        {renderPhoto(checkIn)}

        {checkIn.description && (
          <Section title="Descrição">
            <Text style={styles.description}>{checkIn.description}</Text>
          </Section>
        )}

        {isOwner && (
          <View style={styles.actions}>
            {renderPhotoActions(checkIn)}
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
  photo: {
    marginTop: 16,
  },
  preview: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.gray200,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    marginTop: 24,
    marginBottom: 8,
    gap: 8,
  },
});
