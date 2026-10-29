import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import HabitForm, { type HabitFormValues } from "@/components/habit-form";
import { theme } from "@/config/theme";
import { createHabit } from "@/services/habits-api";

export default function NewHabitScreen() {
  // As telas das abas continuam montadas ao sair delas; trocar a `key` recria
  // o formulário vazio para a próxima vez
  const [formKey, setFormKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      return () => setFormKey((key) => key + 1);
    }, []),
  );

  const handleSubmit = async (values: HabitFormValues) => {
    await createHabit(values);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Novo hábito</Text>
          <Pressable onPress={() => router.back()} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </View>

        <HabitForm
          key={formKey}
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
});
