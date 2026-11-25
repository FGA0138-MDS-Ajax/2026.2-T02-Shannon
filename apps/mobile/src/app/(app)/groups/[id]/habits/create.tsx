import { type Href, router, useLocalSearchParams } from "expo-router";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FormHeader from "@/components/form-header";
import { HabitForm, type HabitFormValues } from "@/components/forms/habit-form";
import { theme } from "@/config/theme";
import { createGroupHabit } from "@/services/groups-api";

export default function CreateGroupHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // `is_public` fica de fora: a API ignora e o hábito de grupo nunca é público
  const handleSubmit = async ({
    goal,
    is_public: _isPublic,
    ...values
  }: HabitFormValues) => {
    if (!goal) return;
    const habit = await createGroupHabit(id, { ...values, goal });
    router.replace(`/groups/${id}/habits/${habit.id}` as Href);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FormHeader title="Novo hábito do grupo" />
        <HabitForm
          withGoal
          withVisibility={false}
          submitLabel="Criar hábito"
          submittingLabel="Criando..."
          onSubmit={handleSubmit}
        />
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
});
