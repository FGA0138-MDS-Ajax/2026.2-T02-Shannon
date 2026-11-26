import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "@/components/button";
import GoalPicker from "@/components/goal-picker";
import { ErrorBanner } from "@/components/ui";
import { theme } from "@/config/theme";
import { getErrorMessage, getFieldErrors } from "@/services/api-errors";
import { setHabitGoal } from "@/services/goals-api";
import type { GoalInput, GoalPublic, Habit } from "@/services/types/habits";

function isSameGoal(current: GoalPublic, next: GoalInput): boolean {
  return (
    current.period === next.period &&
    current.target_count === (next.target_count ?? 1) &&
    current.period_end_weekday === (next.period_end_weekday ?? null)
  );
}

function confirmGoalChange(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      "Trocar a meta",
      "Trocar a meta reinicia o streak e o recorde. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
        { text: "Trocar", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function GoalEditForm({ habit }: { habit: Habit }) {
  const [goal, setGoal] = useState<GoalInput | null>(
    habit.goal
      ? {
          period: habit.goal.period,
          target_count: habit.goal.target_count,
          period_end_weekday: habit.goal.period_end_weekday,
        }
      : null,
  );
  const [goalError, setGoalError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!goal) {
      setGoalError("Escolha o tipo da meta.");
      return;
    }
    setGoalError(null);

    if (habit.goal) {
      if (isSameGoal(habit.goal, goal)) {
        router.back();
        return;
      }
      // Hábito sem meta não tem streak a perder: só avisa ao trocar
      if (!(await confirmGoalChange())) return;
    }

    try {
      setSubmitting(true);
      await setHabitGoal(habit.id, goal);
      router.back();
    } catch (err: unknown) {
      // 422 da meta vem sem campo (`_form`); 403, 404 e 409 trazem o texto da API
      const [fieldError] = Object.values(getFieldErrors(err));
      setErrorMessage(fieldError ?? getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.form}>
      {errorMessage && <ErrorBanner message={errorMessage} />}

      <ScrollView style={styles.fields}>
        {habit.goal && (
          <Text style={styles.hint}>
            Trocar a meta reinicia o streak e o recorde deste hábito.
          </Text>
        )}
        <GoalPicker
          label="Meta"
          value={goal}
          onChange={setGoal}
          error={goalError ?? undefined}
        />
      </ScrollView>

      <View>
        <Button
          variant="primary"
          width="full"
          disabled={submitting}
          onPress={handleSubmit}
        >
          {submitting ? "Salvando..." : "Salvar"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    flex: 1,
  },
  fields: {
    flex: 1,
  },
  hint: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.muted,
    marginBottom: 16,
  },
});
