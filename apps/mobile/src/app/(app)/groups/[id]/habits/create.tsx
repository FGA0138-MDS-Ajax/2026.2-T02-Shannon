import { router, useLocalSearchParams } from "expo-router";
import { HabitForm, type HabitFormValues } from "@/components/forms/habit-form";
import { HeaderAction, Screen, ScreenHeader } from "@/components/ui";
import { createGroupHabit } from "@/services/groups-api";

export default function CreateGroupHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // `is_public` fica de fora: hábito de grupo nunca é público
  const handleSubmit = async ({
    goal,
    is_public: _isPublic,
    ...values
  }: HabitFormValues) => {
    if (!goal) return;
    await createGroupHabit(id, { ...values, goal });
    router.back();
  };

  return (
    <Screen keyboardAvoiding>
      <ScreenHeader
        title="Hábito do grupo"
        subtitle="Todos os integrantes acompanham esta meta. Ela não pode ser alterada depois."
        action={<HeaderAction label="Cancelar" onPress={() => router.back()} />}
      />
      <HabitForm
        withGoal
        withVisibility={false}
        submitLabel="Criar hábito"
        submittingLabel="Criando..."
        onSubmit={handleSubmit}
      />
    </Screen>
  );
}
