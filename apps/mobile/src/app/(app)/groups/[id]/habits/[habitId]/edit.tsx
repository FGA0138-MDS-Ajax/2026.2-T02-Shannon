import { router, useLocalSearchParams } from "expo-router";
import useSWR from "swr";
import { HabitForm, type HabitFormValues } from "@/components/forms/habit-form";
import {
  HeaderAction,
  QueryState,
  Screen,
  ScreenHeader,
} from "@/components/ui";
import { request } from "@/services/api";
import { groupKeys, updateGroupHabit } from "@/services/groups-api";
import type { GroupHabit, GroupHabitUpdate } from "@/services/types/groups";
import { parseApiDate } from "@/utils/date";

// A API aceita só os campos alterados; `null` limpa descrição e data final
function getChangedFields(
  habit: GroupHabit,
  values: HabitFormValues,
): GroupHabitUpdate {
  const changes: GroupHabitUpdate = {};
  if (values.name !== habit.name) changes.name = values.name;
  if (values.category !== habit.category) changes.category = values.category;
  if (values.description !== habit.description)
    changes.description = values.description;
  if (values.target_end_date !== habit.target_end_date)
    changes.target_end_date = values.target_end_date;
  return changes;
}

export default function EditGroupHabitScreen() {
  const { id, habitId } = useLocalSearchParams<{
    id: string;
    habitId: string;
  }>();
  const {
    data: habit,
    error,
    mutate: refreshHabit,
  } = useSWR<GroupHabit>(groupKeys.habit(id, habitId), request);

  const handleSubmit = async (values: HabitFormValues) => {
    if (!habit) return;
    const changes = getChangedFields(habit, values);
    if (Object.keys(changes).length > 0) {
      refreshHabit(await updateGroupHabit(id, habitId, changes), {
        revalidate: false,
      });
    }
    router.back();
  };

  const renderContent = (habit: GroupHabit) => {
    return (
      <HabitForm
        withVisibility={false}
        initialValues={{
          name: habit.name,
          category: habit.category,
          description: habit.description,
          target_end_date: habit.target_end_date,
        }}
        // A data final pode ser anterior a hoje se já estava salva assim
        minimumDate={parseApiDate(habit.created_at)}
        submitLabel="Salvar alterações"
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
      <QueryState data={habit} error={error} onRetry={() => refreshHabit()}>
        {renderContent}
      </QueryState>
    </Screen>
  );
}
