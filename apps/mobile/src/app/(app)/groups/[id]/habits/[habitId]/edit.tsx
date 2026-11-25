import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FormHeader from "@/components/form-header";
import { HabitForm, type HabitFormValues } from "@/components/forms/habit-form";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import { useGroupHabit } from "@/hooks/useGroupHabit";
import { getErrorMessage } from "@/services/api-errors";
import { updateGroupHabit } from "@/services/groups-api";
import type { GroupHabit, GroupHabitUpdate } from "@/services/types/groups";
import { parseApiDate } from "@/utils/date";

// Sem meta e sem "público": a meta de hábito de grupo não muda depois de criada
function changedFields(habit: GroupHabit, values: HabitFormValues) {
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
  const { data: habit, error, mutate } = useGroupHabit(id, habitId);

  const handleSubmit = async (values: HabitFormValues) => {
    if (!habit) return;
    const changes = changedFields(habit, values);
    if (Object.keys(changes).length > 0) {
      mutate(await updateGroupHabit(id, habitId, changes), {
        revalidate: false,
      });
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FormHeader title="Editar hábito" />
        {habit ? (
          <HabitForm
            withVisibility={false}
            initialValues={habit}
            // A data final não pode ser anterior à criação do hábito
            minimumDate={parseApiDate(habit.created_at)}
            submitLabel="Salvar alterações"
            submittingLabel="Salvando..."
            onSubmit={handleSubmit}
          />
        ) : (
          <View style={styles.centered}>
            {error ? (
              <Text style={styles.message}>{getErrorMessage(error)}</Text>
            ) : (
              <ActivityIndicator size="large" color={theme.colors.primary} />
            )}
          </View>
        )}
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: palette.inkSoft,
    textAlign: "center",
  },
});
