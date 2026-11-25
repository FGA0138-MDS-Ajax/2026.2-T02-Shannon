import { router } from "expo-router";
import { StyleSheet, Text } from "react-native";
import useSWR from "swr";
import Button from "@/components/button";
import GoalProgress from "@/components/goal-progress";
import { ErrorBanner, Loading, Section } from "@/components/ui";
import { theme } from "@/config/theme";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { request } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import { habitKeys } from "@/services/habits-api";
import type { Habit, HabitProgress } from "@/services/types/habits";

export interface HabitGoalSectionProps {
  habit: Habit;
  /** Só o autor de um hábito ativo pode definir a meta */
  canChangeGoal: boolean;
}

// Meta e progresso do período atual. Hábito antigo pode não ter meta.
export default function HabitGoalSection({
  habit,
  canChangeGoal,
}: HabitGoalSectionProps) {
  const {
    data: progress,
    error,
    mutate,
  } = useSWR<HabitProgress>(
    habit.goal ? habitKeys.progress(habit.id) : null,
    request,
  );

  // Check-ins e metas mudam em outras telas: recarrega ao voltar
  useRefreshOnFocus(mutate);

  const renderBody = () => {
    if (!habit.goal) {
      return (
        <>
          <Text style={styles.text}>Este hábito ainda não tem meta.</Text>
          {canChangeGoal && (
            <Button
              variant="secondary"
              width="full"
              onPress={() => router.push(`/habits/${habit.id}/goal`)}
            >
              Definir meta
            </Button>
          )}
        </>
      );
    }
    if (error) {
      return (
        <ErrorBanner
          message={getErrorMessage(error)}
          onRetry={() => mutate()}
        />
      );
    }
    if (!progress) return <Loading testID="habit-progress-loading" />;
    return <GoalProgress progress={progress} />;
  };

  return <Section title="Meta">{renderBody()}</Section>;
}

const styles = StyleSheet.create({
  text: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: theme.colors.label,
    lineHeight: 22,
  },
});
