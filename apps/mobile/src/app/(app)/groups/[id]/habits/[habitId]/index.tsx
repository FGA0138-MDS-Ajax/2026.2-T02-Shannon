import {
  type Href,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import useSWR from "swr";
import Button from "@/components/button";
import GoalProgress from "@/components/goal-progress";
import MemberHabitStatsList from "@/components/groups/member-habit-stats";
import {
  ActionRow,
  BackButton,
  Badge,
  Card,
  CenteredMessage,
  ErrorBanner,
  InfoRow,
  Loading,
  Screen,
  Section,
} from "@/components/ui";
import { describeGoal } from "@/config/goal-labels";
import { habitCategoryLabels } from "@/config/habit-categories";
import { theme } from "@/config/theme";
import { confirmAction, useAsyncAction } from "@/hooks/useAsyncAction";
import { useSession } from "@/hooks/useSession";
import { ApiError, request } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import { finishGroupHabit, groupKeys } from "@/services/groups-api";
import type {
  GroupDetail,
  GroupHabit,
  GroupHabitStatistics,
} from "@/services/types/groups";
import { formatDate, parseApiDate } from "@/utils/date";

const formatApiDate = (value: string) => formatDate(parseApiDate(value));

export default function GroupHabitDetailScreen() {
  const { id, habitId } = useLocalSearchParams<{
    id: string;
    habitId: string;
  }>();
  const { user } = useSession();
  const { busy, run } = useAsyncAction();

  const habit = useSWR<GroupHabit>(groupKeys.habit(id, habitId), request);
  const stats = useSWR<GroupHabitStatistics>(
    groupKeys.habitStats(id, habitId),
    request,
  );
  const { data: group } = useSWR<GroupDetail>(groupKeys.detail(id), request);
  const { mutate: refreshHabit } = habit;
  const { mutate: refreshStats } = stats;

  useFocusEffect(
    useCallback(() => {
      refreshHabit();
      refreshStats();
    }, [refreshHabit, refreshStats]),
  );

  const handleFinish = () =>
    confirmAction({
      title: "Encerrar hábito",
      message:
        "O progresso de todos os integrantes fica congelado na data de hoje. Deseja continuar?",
      confirmLabel: "Encerrar",
      destructive: true,
      onConfirm: () =>
        run("Não foi possível encerrar", async () => {
          refreshHabit(await finishGroupHabit(id, habitId), {
            revalidate: false,
          });
          refreshStats();
        }),
    });

  const renderStats = () => {
    if (stats.error && !stats.data) {
      return (
        <ErrorBanner
          message={getErrorMessage(stats.error)}
          onRetry={() => refreshStats()}
        />
      );
    }
    if (!stats.data) return <Loading testID="habit-stats-loading" />;

    const mine = stats.data.members.find((m) => m.user.id === user?.id);
    return (
      <>
        {mine && (
          <Section title="Seu progresso">
            <GoalProgress progress={mine.progress} />
          </Section>
        )}
        <Section title="Integrantes" count={stats.data.members.length}>
          <MemberHabitStatsList
            members={stats.data.members}
            currentUserId={user?.id}
          />
        </Section>
      </>
    );
  };

  const renderContent = () => {
    if (habit.error instanceof ApiError && habit.error.status === 404) {
      return <CenteredMessage message="Hábito não encontrado." />;
    }
    if (habit.error && !habit.data) {
      return (
        <ErrorBanner
          message={getErrorMessage(habit.error)}
          onRetry={() => refreshHabit()}
        />
      );
    }
    if (!habit.data) return <Loading testID="group-habit-loading" fill />;

    const current = habit.data;
    const isFinished = current.status === "finished";
    const isGroupActive = group?.status === "active";
    const canManage =
      group?.my_role === "admin" && isGroupActive && !isFinished;

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>{current.name}</Text>
          <Badge
            label={isFinished ? "Encerrado" : "Ativo"}
            tone={isFinished ? "neutral" : "primary"}
          />
        </View>
        <Text style={styles.details}>
          {habitCategoryLabels[current.category]} · Grupo {current.group.name}
        </Text>
        {current.description && (
          <Text style={styles.description}>{current.description}</Text>
        )}

        <Card style={styles.info}>
          {current.goal && (
            <InfoRow label="Meta" value={describeGoal(current.goal)} />
          )}
          <InfoRow
            label="Criado em"
            value={formatApiDate(current.created_at)}
            last={!current.target_end_date && !current.finished_at}
          />
          {current.target_end_date && (
            <InfoRow
              label="Data final prevista"
              value={formatApiDate(current.target_end_date)}
              last={!current.finished_at}
            />
          )}
          {current.finished_at && (
            <InfoRow
              label="Encerrado em"
              value={formatApiDate(current.finished_at)}
              last
            />
          )}
        </Card>

        {!isFinished && isGroupActive && (
          <Button
            testID="group-habit-check-in"
            width="full"
            style={styles.checkIn}
            onPress={() =>
              router.push({
                pathname: "/check-ins/create",
                params: { habitId: current.id, category: current.category },
              } as Href)
            }
          >
            Fazer check-in
          </Button>
        )}

        {renderStats()}

        {canManage && (
          <View style={styles.actions}>
            <ActionRow
              testID="edit-group-habit"
              icon="edit-2"
              title="Editar"
              description="Nome, categoria, descrição e data final"
              disabled={busy}
              onPress={() =>
                router.push(`/groups/${id}/habits/${habitId}/edit` as Href)
              }
            />
            <ActionRow
              testID="finish-group-habit"
              icon="archive"
              title="Encerrar"
              description="Congelar o progresso de todos na data de hoje"
              destructive
              disabled={busy}
              onPress={handleFinish}
            />
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <Screen>
      <BackButton />
      {renderContent()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 32,
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
    color: theme.colors.text,
  },
  details: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: theme.colors.muted,
  },
  description: {
    marginTop: 12,
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: theme.colors.label,
    lineHeight: 22,
  },
  info: {
    marginTop: 16,
    paddingVertical: 4,
  },
  checkIn: {
    marginTop: 16,
  },
  actions: {
    marginTop: 24,
    gap: 8,
  },
});
