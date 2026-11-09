import {
  type Href,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback, useState, useTransition } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useSWR from "swr";
import Button from "@/components/button";
import { theme } from "@/config/theme";
import { useSession } from "@/hooks/useSession";
import { request } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import { deleteCheckIn } from "@/services/check-ins-api";
import type { CheckIn } from "@/services/types/habits";
import { formatDateTime } from "@/utils/date";
import { formatDuration } from "@/utils/duration";

export default function CheckInDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleting, startDeleting] = useTransition();

  const {
    data: checkIn,
    isLoading,
    error,
    mutate: refreshCheckIn,
  } = useSWR<CheckIn>(`/check-ins/${id}`, request, {
    onError: (err) => setErrorMessage(getErrorMessage(err)),
  });

  const notFound = error?.status === 404;

  useFocusEffect(
    useCallback(() => {
      refreshCheckIn();
    }, [refreshCheckIn]),
  );

  const handleDelete = () => {
    Alert.alert(
      "Excluir check-in",
      "Essa ação não pode ser desfeita. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () =>
            startDeleting(async () => {
              try {
                await deleteCheckIn(id);
                router.back();
              } catch (err: unknown) {
                Alert.alert("Não foi possível excluir", getErrorMessage(err));
              }
            }),
        },
      ],
    );
  };

  const renderContent = () => {
    if (isLoading && !checkIn) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    if (notFound) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Check-in não encontrado.</Text>
        </View>
      );
    }

    if (errorMessage || !checkIn) {
      return (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            {errorMessage ?? "Não foi possível carregar o check-in."}
          </Text>
          <Button variant="secondary" onPress={() => refreshCheckIn()}>
            Tentar novamente
          </Button>
        </View>
      );
    }

    const isOwner = checkIn.user_id === user?.id;

    return (
      <ScrollView>
        <Text style={styles.title}>{checkIn.title}</Text>
        <Text style={styles.details}>
          {formatDateTime(checkIn.created_at)}
          {checkIn.duration ? ` · ${formatDuration(checkIn.duration)}` : ""}
        </Text>

        {checkIn.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descrição</Text>
            <Text style={styles.sectionText}>{checkIn.description}</Text>
          </View>
        )}

        {isOwner && (
          <View style={styles.actions}>
            <Button
              variant="secondary"
              width="full"
              disabled={deleting}
              style={styles.actionButton}
              // Cast: os tipos gerados pelo Expo ainda não reconhecem o [id]
              onPress={() =>
                router.push(`/check-ins/${checkIn.id}/edit` as Href)
              }
            >
              Editar
            </Button>
            <Pressable
              disabled={deleting}
              onPress={handleDelete}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteText}>Excluir check-in</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>Voltar</Text>
      </Pressable>
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: theme.colors.gray,
  },
  backButton: {
    marginTop: 8,
    marginBottom: 16,
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  backButtonText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.primaryDark,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: "#6B6560",
    textAlign: "center",
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  errorBannerText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: "#B91C1C",
    textAlign: "center",
  },
  title: {
    fontFamily: theme.font.bold,
    fontSize: 26,
    color: "#1C1917",
    marginBottom: 4,
  },
  details: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: "#6B6560",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontFamily: theme.font.semiBold,
    fontSize: 15,
    color: "#1C1917",
    marginBottom: 6,
  },
  sectionText: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: "#3D3835",
    lineHeight: 22,
  },
  actions: {
    marginTop: 24,
    marginBottom: 8,
    gap: 8,
  },
  // O Button tem margem lateral de 8; somada à largura total, ele passaria
  // da borda direita e seria cortado pela ScrollView
  actionButton: {
    marginHorizontal: 0,
  },
  deleteButton: {
    alignSelf: "center",
    paddingVertical: 8,
  },
  deleteText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: "#B91C1C",
  },
});
