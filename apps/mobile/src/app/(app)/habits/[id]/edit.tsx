import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import useSWR from "swr";
import Button from "@/components/button";
import { HabitForm, type HabitFormValues } from "@/components/forms/habit-form";
import {
  HeaderAction,
  QueryState,
  Screen,
  ScreenHeader,
} from "@/components/ui";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { request } from "@/services/api";
import { habitKeys, updateHabit } from "@/services/habits-api";
import type { Habit, HabitUpdate } from "@/services/types/habits";
import { parseApiDate } from "@/utils/date";

// A API aceita só os campos alterados; `null` limpa descrição e data final
function getChangedFields(habit: Habit, values: HabitFormValues): HabitUpdate {
  const changes: HabitUpdate = {};
  if (values.name !== habit.name) changes.name = values.name;
  if (values.category !== habit.category) changes.category = values.category;
  if (values.is_public !== habit.is_public)
    changes.is_public = values.is_public;
  if (values.description !== habit.description)
    changes.description = values.description;
  if (values.target_end_date !== habit.target_end_date)
    changes.target_end_date = values.target_end_date;
  return changes;
}

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: habit,
    error,
    mutate: refreshHabit,
  } = useSWR<Habit>(habitKeys.detail(id), request);

  useRefreshOnFocus(refreshHabit);

  const handleSubmit = async (values: HabitFormValues) => {
    if (!habit) return;
    const changes = getChangedFields(habit, values);
    if (Object.keys(changes).length > 0) {
      await updateHabit(habit.id, changes);
    }
    router.back();
  };

  const renderContent = (habit: Habit) => {
    return (
      <HabitForm
        key={habit.id}
        initialValues={{
          name: habit.name,
          category: habit.category,
          description: habit.description,
          is_public: habit.is_public,
          target_end_date: habit.target_end_date,
        }}
        // A data final pode ser anterior a hoje se já estava salva assim
        minimumDate={parseApiDate(habit.created_at)}
        submitLabel="Salvar"
        submittingLabel="Salvando..."
        onSubmit={handleSubmit}
      />
    );
  };

  return (
    <Screen keyboardAvoiding>
      <ScreenHeader
        title="Editar hábito"
        action={<HeaderAction label="Cancelar" onPress={() => router.back()} />}
      />
      <QueryState
        data={habit}
        error={error}
        onRetry={() => refreshHabit()}
        notFoundMessage="Hábito não encontrado."
      >
        {renderContent}
      </QueryState>
      <View style={styles.goal}>
        <Button
          variant="secondary"
          width="full"
          onPress={() => router.push(`/habits/${id}/goal`)}
        >
          Editar meta
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  goal: {
    marginBottom: 8,
  },
});
