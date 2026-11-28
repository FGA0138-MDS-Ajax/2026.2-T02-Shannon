import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import useSWR, { useSWRConfig } from "swr";
import Button from "@/components/button";
import HabitActions from "@/components/habit-detail/habit-actions";
import HabitCheckInsSection from "@/components/habit-detail/habit-check-ins-section";
import HabitGoalSection from "@/components/habit-detail/habit-goal-section";
import HabitSummary from "@/components/habit-detail/habit-summary";
import { BackButton, QueryState, Screen } from "@/components/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { useSession } from "@/hooks/useSession";
import { request } from "@/services/api";
import { habitKeys } from "@/services/habits-api";
import type { Habit } from "@/services/types/habits";

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const { mutate: globalMutate } = useSWRConfig();
  const {
    data: habit,
    error,
    mutate: refreshHabit,
  } = useSWR<Habit>(habitKeys.detail(id), request);

  useRefreshOnFocus(refreshHabit);
  usePageTitle(habit?.name);

  const handleFinished = (updated: Habit) => {
    refreshHabit(updated, { revalidate: false });
    // O progresso passa a "encerrado"
    globalMutate(habitKeys.progress(id));
  };

  const renderContent = (habit: Habit) => {
    const isFinished = habit.status === "finished";
    // Hábito de grupo só é gerenciado pela tela do grupo
    const isGroupHabit = habit.group != null;
    const isAuthor = !isGroupHabit && habit.author_user_id === user?.id;

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <HabitSummary habit={habit}>
          {/* Hábito de grupo só é gerenciado pela tela do grupo */}
          {habit.group && (
            <Button
              testID="open-group-habit"
              variant="outline"
              width="full"
              style={styles.groupButton}
              onPress={() =>
                router.push(`/groups/${habit.group?.id}/habits/${habit.id}`)
              }
            >
              Ver no grupo
            </Button>
          )}
        </HabitSummary>

        <HabitGoalSection
          habit={habit}
          canChangeGoal={!isGroupHabit && isAuthor && !isFinished}
        />
        <HabitCheckInsSection habitId={habit.id} />

        {/* Nada que leve às rotas pessoais de escrita em hábito de grupo */}
        {isAuthor && !isGroupHabit && (
          <HabitActions habit={habit} onFinished={handleFinished} />
        )}
      </ScrollView>
    );
  };

  return (
    <Screen>
      <BackButton />
      <QueryState
        data={habit}
        error={error}
        onRetry={() => refreshHabit()}
        notFoundMessage="Hábito não encontrado."
        loadingTestID="habit-detail-loading"
      >
        {renderContent}
      </QueryState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 32,
  },
  groupButton: {
    marginTop: 16,
  },
});
