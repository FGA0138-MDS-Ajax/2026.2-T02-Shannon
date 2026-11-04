import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useSWR from "swr";
import Button from "@/components/button";
import GoalPicker from "@/components/goal-picker";
import { theme } from "@/config/theme";
import { request } from "@/services/api";
import { getErrorMessage, getFieldErrors } from "@/services/api-errors";
import { setHabitGoal } from "@/services/goals-api";
import type { GoalInput, GoalPublic, Habit } from "@/services/types/habits";

// Mesma regra da API: só muda se o tipo, a quantidade ou o dia mudarem
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

export default function HabitGoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // As telas das abas continuam montadas; trocar a `key` a cada visita
  // recria o formulário com a meta atual
  const [visit, setVisit] = useState(0);

  const {
    data: habit,
    isLoading,
    error,
    mutate: refreshHabit,
  } = useSWR<Habit>(`/habits/${id}`, request, {
    onError: (err) => setErrorMessage(getErrorMessage(err)),
  });

  const notFound = error?.status === 404;

  useFocusEffect(
    useCallback(() => {
      setErrorMessage(null);
      setVisit((current) => current + 1);
      refreshHabit();
    }, [refreshHabit]),
  );

  const renderContent = () => {
    if (notFound) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Hábito não encontrado.</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
          <Button variant="secondary" onPress={() => refreshHabit()}>
            Tentar novamente
          </Button>
        </View>
      );
    }

    if (isLoading || !habit) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    if (habit.status === "finished") {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            Hábito encerrado não aceita alteração de meta.
          </Text>
        </View>
      );
    }

    return <GoalForm key={`${habit.id}-${visit}`} habit={habit} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {habit && !habit.goal ? "Definir meta" : "Editar meta"}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </View>

      {renderContent()}
    </SafeAreaView>
  );
}

// Separado da tela para o seletor começar com a meta do hábito já carregado
function GoalForm({ habit }: { habit: Habit }) {
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
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}

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

      <View style={styles.actions}>
        <Button
          variant="primary"
          width="full"
          disabled={submitting}
          style={styles.actionButton}
          onPress={handleSubmit}
        >
          {submitting ? "Salvando..." : "Salvar"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: theme.colors.gray,
  },
  header: {
    marginTop: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: theme.font.bold,
    fontSize: 28,
    color: "#1C1917",
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.primaryDark,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: "#6B6560",
    textAlign: "center",
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: "#B91C1C",
    textAlign: "center",
  },
  form: {
    flex: 1,
  },
  fields: {
    flex: 1,
  },
  hint: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: "#6B6560",
    marginBottom: 16,
  },
  actions: {
    paddingVertical: 12,
  },
  // O Button tem margem lateral de 8; somada à largura total, ele passaria
  // da borda direita
  actionButton: {
    marginHorizontal: 0,
  },
});
