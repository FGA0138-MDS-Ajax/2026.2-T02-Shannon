import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
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
import { habitCategoryLabels } from "@/config/habit-categories";
import { theme } from "@/config/theme";
import { ApiError } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import { getHabit, listHabitCheckIns } from "@/services/habits-api";
import type { CheckIn, Habit } from "@/services/types/habits";
import { formatDate, formatDateTime, parseApiDate } from "@/utils/date";
import { formatDuration } from "@/utils/duration";

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[] | null>(null);
  const [checkInsError, setCheckInsError] = useState<string | null>(null);
  const checkInsHabitId = useRef<string | null>(null);

  // O histórico carrega à parte: se falhar, os dados do hábito continuam na tela
  const loadCheckIns = useCallback(async () => {
    setCheckInsError(null);
    // Ao abrir outro hábito, não mostra o histórico do anterior
    if (checkInsHabitId.current !== id) {
      setCheckIns(null);
    }
    try {
      const data = await listHabitCheckIns(id);
      checkInsHabitId.current = id;
      setCheckIns(data);
    } catch (err: unknown) {
      setCheckIns(null);
      setCheckInsError(getErrorMessage(err));
    }
  }, [id]);

  const loadHabit = useCallback(async () => {
    setErrorMessage(null);
    setNotFound(false);
    setLoading(true);
    // Ao abrir outro hábito, não mostra o anterior enquanto carrega
    setHabit((current) => (current?.id === id ? current : null));

    try {
      setHabit(await getHabit(id));
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
      loadHabit();
      loadCheckIns();
    }, [loadHabit, loadCheckIns]),
  );

  const renderCheckIns = () => {
    if (checkInsError) {
      return (
        <Pressable onPress={loadCheckIns}>
          <Text style={styles.checkInsError}>
            {checkInsError} Toque para tentar novamente.
          </Text>
        </Pressable>
      );
    }

    if (!checkIns) {
      return <ActivityIndicator color={theme.colors.primary} />;
    }

    if (checkIns.length === 0) {
      return (
        <Text style={styles.sectionText}>
          Nenhum check-in registrado ainda.
        </Text>
      );
    }

    return checkIns.map((checkIn) => (
      <View key={checkIn.id} testID="check-in-item" style={styles.checkIn}>
        <Text style={styles.checkInTitle}>{checkIn.title}</Text>
        <Text style={styles.checkInDetails}>
          {formatDateTime(checkIn.created_at)}
          {checkIn.duration ? ` · ${formatDuration(checkIn.duration)}` : ""}
        </Text>
      </View>
    ));
  };

  const renderContent = () => {
    if (loading && !habit) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    if (notFound) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Hábito não encontrado.</Text>
        </View>
      );
    }

    if (errorMessage || !habit) {
      return (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            {errorMessage ?? "Não foi possível carregar o hábito."}
          </Text>
          <Button variant="secondary" onPress={loadHabit}>
            Tentar novamente
          </Button>
        </View>
      );
    }

    const isFinished = habit.status === "finished";

    return (
      <ScrollView>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{habit.name}</Text>
          <View style={[styles.badge, !isFinished && styles.badgeActive]}>
            <Text
              style={[styles.badgeText, !isFinished && styles.badgeTextActive]}
            >
              {isFinished ? "Encerrado" : "Ativo"}
            </Text>
          </View>
        </View>
        <Text style={styles.details}>
          {habitCategoryLabels[habit.category]} ·{" "}
          {habit.is_public ? "Público" : "Privado"}
        </Text>

        {habit.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descrição</Text>
            <Text style={styles.sectionText}>{habit.description}</Text>
          </View>
        )}

        <View style={styles.section}>
          <InfoRow label="Criado em" value={habit.created_at} />
          {habit.target_end_date && (
            <InfoRow
              label="Data final prevista"
              value={habit.target_end_date}
            />
          )}
          {habit.finished_at && (
            <InfoRow label="Encerrado em" value={habit.finished_at} />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Check-ins</Text>
          {renderCheckIns()}
        </View>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{formatDate(parseApiDate(value))}</Text>
    </View>
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontFamily: theme.font.bold,
    fontSize: 26,
    color: "#1C1917",
  },
  badge: {
    backgroundColor: "#E7E2DE",
    borderRadius: 9999,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  badgeActive: {
    backgroundColor: "#FDE7DD",
  },
  badgeText: {
    fontFamily: theme.font.medium,
    fontSize: 12,
    color: "#57534E",
  },
  badgeTextActive: {
    color: theme.colors.primaryDark,
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
  checkIn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7E2DE",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  checkInTitle: {
    fontFamily: theme.font.semiBold,
    fontSize: 15,
    color: "#1C1917",
    marginBottom: 2,
  },
  checkInDetails: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: "#6B6560",
  },
  checkInsError: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: "#B91C1C",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E7E2DE",
  },
  infoLabel: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: "#6B6560",
  },
  infoValue: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: "#1C1917",
  },
});
