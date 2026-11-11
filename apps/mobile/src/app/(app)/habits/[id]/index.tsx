import { Lucide } from "@react-native-vector-icons/lucide";
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
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useSWR from "swr";
import Button from "@/components/button";
import GoalProgress from "@/components/goal-progress";
import { habitCategoryLabels } from "@/config/habit-categories";
import { theme } from "@/config/theme";
import { useSession } from "@/hooks/useSession";
import { request } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import { deleteHabit, finishHabit } from "@/services/habits-api";
import type { CheckIn, Habit, HabitProgress } from "@/services/types/habits";
import { formatDate, formatDateTime, parseApiDate } from "@/utils/date";
import { formatDuration } from "@/utils/duration";

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkInsError, setCheckInsError] = useState<string | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [acting, startActing] = useTransition();

  const {
    data: habit,
    isLoading,
    error: habitError,
    mutate: refreshHabit,
  } = useSWR<Habit>(`/habits/${id}`, request, {
    onError: (err) => setErrorMessage(getErrorMessage(err)),
  });

  const notFound = habitError?.status === 404;

  const { data: checkIns, mutate: refreshCheckIns } = useSWR<CheckIn[]>(
    `/habits/${id}/check-ins`,
    request,
    {
      onError: (err) => setCheckInsError(getErrorMessage(err)),
    },
  );

  const { data: progress, mutate: refreshProgress } = useSWR<HabitProgress>(
    habit?.goal ? `/goals/habits/${id}/progress` : null,
    request,
    {
      onError: (err) => setProgressError(getErrorMessage(err)),
    },
  );

  useFocusEffect(
    useCallback(() => {
      setErrorMessage(null);
      setCheckInsError(null);
      setProgressError(null);
      refreshHabit();
      refreshCheckIns();
      refreshProgress();
    }, [refreshHabit, refreshCheckIns, refreshProgress]),
  );

  const handleFinish = () => {
    Alert.alert(
      "Encerrar hábito",
      "O hábito vai para a lista de encerrados. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Encerrar",
          onPress: () =>
            startActing(async () => {
              try {
                const updated = await finishHabit(id);
                refreshHabit(updated, { revalidate: false });
                // O progresso passa a "encerrado"
                refreshProgress();
              } catch (err: unknown) {
                Alert.alert("Não foi possível encerrar", getErrorMessage(err));
              }
            }),
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Excluir hábito",
      "Essa ação não pode ser desfeita. Os check-ins registrados continuam salvos.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () =>
            startActing(async () => {
              try {
                await deleteHabit(id);
                router.back();
              } catch (err: unknown) {
                Alert.alert("Não foi possível excluir", getErrorMessage(err));
              }
            }),
        },
      ],
    );
  };

  const renderGoal = (habit: Habit, canChangeGoal: boolean) => {
    if (!habit.goal) {
      return (
        <>
          <Text style={styles.sectionText}>
            Este hábito ainda não tem meta.
          </Text>
          {canChangeGoal && (
            <Button
              variant="secondary"
              width="full"
              style={styles.defineGoalButton}
              // Cast: os tipos gerados pelo Expo ainda não reconhecem o [id]
              onPress={() => router.push(`/habits/${habit.id}/goal` as Href)}
            >
              Definir meta
            </Button>
          )}
        </>
      );
    }

    if (progressError) {
      return (
        <Pressable
          onPress={() => {
            setProgressError(null);
            refreshProgress();
          }}
        >
          <Text style={styles.checkInsError}>
            {progressError} Toque para tentar novamente.
          </Text>
        </Pressable>
      );
    }

    if (!progress) {
      return (
        <ActivityIndicator
          testID="habit-progress-loading"
          color={theme.colors.primary}
        />
      );
    }

    return <GoalProgress progress={progress} />;
  };

  const renderCheckIns = () => {
    if (checkInsError) {
      return (
        <Pressable onPress={() => refreshCheckIns()}>
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
      <Pressable
        key={checkIn.id}
        testID="check-in-item"
        style={styles.checkIn}
        onPress={() => router.push(`/check-ins/${checkIn.id}` as Href)}
      >
        <Text style={styles.checkInTitle}>{checkIn.title}</Text>
        <Text style={styles.checkInDetails}>
          {formatDateTime(checkIn.created_at)}
          {checkIn.duration ? ` · ${formatDuration(checkIn.duration)}` : ""}
        </Text>
      </Pressable>
    ));
  };

  const renderContent = () => {
    if (isLoading && !habit) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator
            testID="habit-detail-loading"
            size="large"
            color={theme.colors.primary}
          />
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
          <Button
            variant="secondary"
            onPress={() => {
              setErrorMessage(null);
              refreshHabit();
            }}
          >
            Tentar novamente
          </Button>
        </View>
      );
    }

    const isFinished = habit.status === "finished";
    const isAuthor = habit.author_user_id === user?.id;
    const canChangeGoal = isAuthor && !isFinished;

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
          <Text style={styles.sectionTitle}>Meta</Text>
          {renderGoal(habit, canChangeGoal)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Check-ins</Text>
          {renderCheckIns()}
        </View>

        {isAuthor && (
          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={acting}
              style={styles.actionButton}
              onPress={() => router.push(`/habits/${habit.id}/edit` as Href)}
            >
              <View style={styles.actionTitleRow}>
                <Lucide name="edit-2" size={16} />
                <Text style={styles.actionTitle}>Editar</Text>
              </View>
              <Text style={styles.actionButtonText}>
                Editar metas, descrição e configurações
              </Text>
            </TouchableOpacity>
            {!isFinished && (
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={acting}
                style={styles.actionButton}
                onPress={handleFinish}
              >
                <View style={styles.actionTitleRow}>
                  <Lucide name="archive" size={16} />
                  <Text style={styles.actionTitle}>Finalizar</Text>
                </View>
                <Text style={styles.actionButtonText}>
                  Encerrar o hábito e movê-lo para a lista de encerrados
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={acting}
              style={styles.actionButton}
              onPress={handleDelete}
            >
              <View style={styles.actionTitleRow}>
                <Lucide name="delete" size={16} />
                <Text style={styles.actionTitle}>Deletar</Text>
              </View>
              <Text style={styles.deleteText}>
                Excluir o hábito permanentemente
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView
      edges={{
        bottom: "off",
        top: "additive",
      }}
      style={styles.container}
    >
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Lucide name="arrow-left" size={16} color={theme.colors.primaryDark} />
        <Text style={styles.backButtonText}>Voltar</Text>
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
    paddingTop: 16,
    backgroundColor: theme.colors.gray,
  },
  backButton: {
    marginTop: 8,
    marginBottom: 16,
    alignSelf: "flex-start",
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  actions: {
    marginTop: 24,
    marginBottom: 8,
    gap: 8,
  },
  actionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  actionButton: {
    backgroundColor: theme.colors.gray100,
    padding: 12,
    borderRadius: 12,
    width: "100%",
    borderWidth: 1,
    borderColor: theme.colors.gray300,
  },
  actionTitle: {
    fontFamily: theme.font.bold,
    fontSize: 16,
    color: "#1C1917",
  },
  actionButtonText: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: "#6B6560",
  },
  defineGoalButton: {
    marginHorizontal: 0,
    marginTop: 8,
  },
  deleteText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: "#B91C1C",
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
