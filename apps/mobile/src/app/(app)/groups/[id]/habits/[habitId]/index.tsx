import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import useSWR, { useSWRConfig } from "swr";
import Button from "@/components/button";
import GoalProgress from "@/components/goal-progress";
import MemberHabitStatsList from "@/components/groups/member-habit-stats";
import HabitSummary from "@/components/habit-detail/habit-summary";
import QuickCheckInSheet from "@/components/quick-check-in";
import {
  ActionRow,
  BackButton,
  ErrorBanner,
  Loading,
  QueryState,
  Screen,
  Section,
} from "@/components/ui";
import { confirmAction, useAsyncAction } from "@/hooks/useAsyncAction";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { useSession } from "@/hooks/useSession";
import { ApiError, request } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import { finishGroupHabit, groupKeys } from "@/services/groups-api";
import type {
  GroupDetail,
  GroupHabit,
  GroupHabitStatistics,
} from "@/services/types/groups";
import { memberColors } from "@/utils/group-period";

export default function GroupHabitDetailScreen() {
  const { id, habitId } = useLocalSearchParams<{
    id: string;
    habitId: string;
  }>();
  const { user } = useSession();
  const { busy, run } = useAsyncAction();
  const [checkingIn, setCheckingIn] = useState(false);

  const habit = useSWR<GroupHabit>(groupKeys.habit(id, habitId), request);
  const stats = useSWR<GroupHabitStatistics>(
    groupKeys.habitStats(id, habitId),
    request,
  );
  const { data: group } = useSWR<GroupDetail>(groupKeys.detail(id), request);
  const { mutate: refreshHabit } = habit;
  const { mutate: refreshStats } = stats;
  const { mutate: refreshHabitList } = useSWRConfig();

  useRefreshOnFocus(refreshHabit);
  useRefreshOnFocus(refreshStats);
  usePageTitle(habit.data?.name);

  const handleFinish = () =>
    confirmAction({
      title: "Encerrar hábito",
      message:
        "O progresso de todos os integrantes fica congelado na data de hoje. Deseja continuar?",
      confirmLabel: "Encerrar",
      destructive: true,
      onConfirm: () =>
        run("Não foi possível encerrar", async () => {
          try {
            refreshHabit(await finishGroupHabit(id, habitId), {
              revalidate: false,
            });
          } catch (err: unknown) {
            // 409 "Hábito já encerrado.": recarrega a lista/detalhe e reexibe
            if (err instanceof ApiError && err.status === 409) {
              refreshHabit();
              refreshStats();
              refreshHabitList(groupKeys.habits(id));
            }
            throw err;
          }
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
            colorOf={memberColors(group?.members ?? [])}
          />
        </Section>
      </>
    );
  };

  const renderContent = (current: GroupHabit) => {
    const isFinished = current.status === "finished";
    const isGroupActive = group?.status === "active";
    const canManage =
      group?.my_role === "admin" && isGroupActive && !isFinished;

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <HabitSummary habit={current} showGoal />

        {!isFinished && isGroupActive && (
          <Button
            testID="group-habit-check-in"
            width="full"
            style={styles.checkIn}
            onPress={() => setCheckingIn(true)}
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
                router.push(`/groups/${id}/habits/${habitId}/edit`)
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
      <QueryState
        data={habit.data}
        error={habit.error}
        onRetry={() => refreshHabit()}
        notFoundMessage="Hábito não encontrado."
        loadingTestID="group-habit-loading"
      >
        {renderContent}
      </QueryState>
      <QuickCheckInSheet
        habit={checkingIn ? (habit.data ?? null) : null}
        userId={user?.id}
        onClose={() => setCheckingIn(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 32,
  },
  checkIn: {
    marginTop: 16,
  },
  actions: {
    marginTop: 24,
    gap: 8,
  },
});
