import { router } from "expo-router";
import { HabitForm, type HabitFormValues } from "@/components/forms/habit-form";
import { HeaderAction, Screen, ScreenHeader } from "@/components/ui";
import { createHabit } from "@/services/habits-api";

export default function CreateHabitScreen() {
  const handleSubmit = async ({ goal, ...values }: HabitFormValues) => {
    if (!goal) return;
    await createHabit({ ...values, goal });
    router.back();
  };

  return (
    <Screen keyboardAvoiding>
      <ScreenHeader
        title="Novo hábito"
        action={<HeaderAction label="Cancelar" onPress={() => router.back()} />}
      />
      <HabitForm
        withGoal
        submitLabel="Criar hábito"
        submittingLabel="Criando..."
        onSubmit={handleSubmit}
      />
    </Screen>
  );
}
