import DateTimePicker from "@expo/ui/community/datetime-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "@/components/button";
import CategoryPicker from "@/components/category-picker";
import Input from "@/components/input";
import { theme } from "@/config/theme";
import {
  createHabit,
  getFieldErrors,
  type HabitCategory,
} from "@/services/habits-mock";

type FieldErrors = {
  name?: string;
  category?: string;
  description?: string;
  target_end_date?: string;
};

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Formato que a API espera (YYYY-MM-DD), usando a data local
function toApiDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function toDisplayDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

export default function NewHabitScreen() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<HabitCategory | null>(null);
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [targetEndDate, setTargetEndDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // As telas das abas continuam montadas ao sair delas, então o formulário
  // é limpo ao sair para começar vazio na próxima vez
  useFocusEffect(
    useCallback(() => {
      return () => {
        setName("");
        setCategory(null);
        setDescription("");
        setIsPublic(false);
        setTargetEndDate(null);
        setShowDatePicker(false);
        setFieldErrors({});
        setErrorMessage(null);
      };
    }, []),
  );

  const handleSubmit = async () => {
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const errors: FieldErrors = {};

    if (!trimmedName) {
      errors.name = "Informe o nome do hábito.";
    } else if (trimmedName.length > 100) {
      errors.name = "Use no máximo 100 caracteres.";
    }

    if (!category) {
      errors.category = "Escolha uma categoria.";
    }

    if (trimmedDescription.length > 500) {
      errors.description = "Use no máximo 500 caracteres.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !category) {
      return;
    }

    try {
      setSubmitting(true);
      await createHabit({
        name: trimmedName,
        category,
        description: trimmedDescription || null,
        is_public: isPublic,
        target_end_date: targetEndDate ? toApiDate(targetEndDate) : null,
      });
      router.back();
    } catch (err: unknown) {
      const apiFieldErrors = getFieldErrors(err);
      if (Object.keys(apiFieldErrors).length > 0) {
        setFieldErrors(apiFieldErrors);
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : "Erro ao criar o hábito.",
        );
      }
    } finally {
      setSubmitting(false);
    }
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

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}

        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          <Input
            testID="habit-name-input"
            label="Nome"
            placeholder="ex: Correr 5 km"
            value={name}
            onChangeText={setName}
            autoCapitalize="sentences"
            maxLength={100}
            error={fieldErrors.name}
          />

          <CategoryPicker
            label="Categoria"
            value={category}
            onChange={setCategory}
            error={fieldErrors.category}
          />

          <Input
            testID="habit-description-input"
            label="Descrição (opcional)"
            placeholder="Detalhes sobre o hábito"
            value={description}
            onChangeText={setDescription}
            autoCapitalize="sentences"
            multiline
            maxLength={500}
            error={fieldErrors.description}
          />

          <View style={styles.switchRow}>
            <View style={styles.switchLabels}>
              <Text style={styles.label}>Público</Text>
              <Text style={styles.hint}>
                {isPublic
                  ? "Outras pessoas podem ver este hábito."
                  : "Só você vê este hábito."}
              </Text>
            </View>
            <Switch
              testID="habit-public-switch"
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ true: theme.colors.primary }}
            />
          </View>

          <View style={styles.dateField}>
            <Text style={styles.label}>Data final (opcional)</Text>
            <View style={styles.dateRow}>
              <Pressable
                testID="habit-date-button"
                onPress={() => setShowDatePicker(true)}
                style={styles.dateButton}
              >
                <Text style={styles.dateButtonText}>
                  {targetEndDate
                    ? toDisplayDate(targetEndDate)
                    : "Escolher data"}
                </Text>
              </Pressable>
              {targetEndDate && (
                <Pressable onPress={() => setTargetEndDate(null)}>
                  <Text style={styles.removeDateText}>Remover</Text>
                </Pressable>
              )}
            </View>
            {fieldErrors.target_end_date && (
              <Text style={styles.errorText}>
                {fieldErrors.target_end_date}
              </Text>
            )}
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={targetEndDate ?? startOfToday()}
              mode="date"
              minimumDate={startOfToday()}
              presentation="dialog"
              accentColor={theme.colors.primary}
              onValueChange={(_event, date) => {
                setShowDatePicker(false);
                setTargetEndDate(date);
              }}
              onDismiss={() => setShowDatePicker(false)}
            />
          )}
        </ScrollView>

        <View style={styles.actions}>
          <Button
            variant="primary"
            width="full"
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Criando..." : "Criar hábito"}
          </Button>
        </View>
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
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorBannerText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: "#B91C1C",
  },
  form: {
    width: "100%",
  },
  label: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: "#3D3835",
    marginBottom: 6,
  },
  hint: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: "#6B6560",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  switchLabels: {
    flex: 1,
  },
  dateField: {
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  dateButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8D2CD",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dateButtonText: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: "#1C1917",
  },
  removeDateText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.primaryDark,
  },
  errorText: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
  },
  actions: {
    marginTop: 12,
    width: "100%",
  },
});
