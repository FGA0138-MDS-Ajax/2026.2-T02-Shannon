import {
  type Href,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "@/components/button";
import { theme } from "@/config/theme";
import { useSession } from "@/hooks/useSession";
import { ApiError } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import { getCheckIn } from "@/services/check-ins-api";
import type { CheckIn } from "@/services/types/habits";
import { formatDateTime } from "@/utils/date";
import { formatDuration } from "@/utils/duration";

export default function CheckInDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCheckIn = useCallback(async () => {
    setErrorMessage(null);
    setNotFound(false);
    setLoading(true);
    // Ao abrir outro check-in, não mostra o anterior enquanto carrega
    setCheckIn((current) => (current?.id === id ? current : null));

    try {
      setCheckIn(await getCheckIn(id));
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setErrorMessage(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadCheckIn();
    }, [loadCheckIn]),
  );

  const renderContent = () => {
    if (loading && !checkIn) {
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
          <Button variant="secondary" onPress={loadCheckIn}>
            Tentar novamente
          </Button>
        </View>
      );
    }

    // Só quem registrou o check-in pode alterá-lo
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
              style={styles.actionButton}
              // Cast: os tipos gerados pelo Expo ainda não reconhecem o [id]
              onPress={() =>
                router.push(`/check-ins/${checkIn.id}/edit` as Href)
              }
            >
              Editar
            </Button>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Voltar</Text>
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
});
