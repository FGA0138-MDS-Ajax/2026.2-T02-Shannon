import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "@/components/button";
import HabitForm, { type HabitFormValues } from "@/components/habit-form";
import { theme } from "@/config/theme";
import { ApiError } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import { getHabit, updateHabit } from "@/services/habits-api";
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
  const [habit, setHabit] = useState<Habit | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Busca de novo a cada abertura: a tela continua montada entre as visitas
  const loadHabit = useCallback(async () => {
    setHabit(null);
    setNotFound(false);
    setErrorMessage(null);

    try {
      setHabit(await getHabit(id));
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setErrorMessage(getErrorMessage(err));
      }
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadHabit();
    }, [loadHabit]),
  );

  const handleSubmit = async (values: HabitFormValues) => {
    if (!habit) return;
    const changes = getChangedFields(habit, values);
    if (Object.keys(changes).length > 0) {
      await updateHabit(habit.id, changes);
    }
    router.back();
  };

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
          <Button variant="secondary" onPress={loadHabit}>
            Tentar novamente
          </Button>
        </View>
      );
    }

    if (!habit) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

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
        // A data final não pode ser anterior à criação do hábito
        minimumDate={parseApiDate(habit.created_at)}
        submitLabel="Salvar"
        submittingLabel="Salvando..."
        onSubmit={handleSubmit}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Editar hábito</Text>
          <Pressable onPress={() => router.back()} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </View>

        {renderContent()}
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
  },
  errorBannerText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: "#B91C1C",
    textAlign: "center",
  },
});
