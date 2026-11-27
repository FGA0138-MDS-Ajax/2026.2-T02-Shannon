import { router, useLocalSearchParams } from "expo-router";
import useSWR from "swr";
import { GoalEditForm } from "@/components/forms/habit-edit-goal-form";
import {
  CenteredMessage,
  HeaderAction,
  QueryState,
  Screen,
  ScreenHeader,
} from "@/components/ui";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { request } from "@/services/api";
import { habitKeys } from "@/services/habits-api";
import type { Habit } from "@/services/types/habits";

export default function HabitGoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: habit,
    error,
    mutate: refreshHabit,
  } = useSWR<Habit>(habitKeys.detail(id), request);

  useRefreshOnFocus(refreshHabit);

  const renderContent = (habit: Habit) => {
    if (habit.status === "finished") {
      return (
        <CenteredMessage message="Hábito encerrado não aceita alteração de meta." />
      );
    }
    return <GoalEditForm habit={habit} />;
  };

  return (
    <Screen keyboardAvoiding>
      <ScreenHeader
        title={habit && !habit.goal ? "Definir meta" : "Editar meta"}
        action={<HeaderAction label="Cancelar" onPress={() => router.back()} />}
      />
      <QueryState
        data={habit}
        error={error}
        onRetry={() => refreshHabit()}
        notFoundMessage="Hábito não encontrado."
        loadingTestID="goal-edit-loading"
      >
        {renderContent}
      </QueryState>
    </Screen>
  );
}
