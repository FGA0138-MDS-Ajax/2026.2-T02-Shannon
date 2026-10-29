import DateTimePicker from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Button from "@/components/button";
import CategoryPicker from "@/components/category-picker";
import Input from "@/components/input";
import { theme } from "@/config/theme";
import {
  FORM_ERROR_KEY,
  getErrorMessage,
  getFieldErrors,
} from "@/services/api-errors";
import type { HabitCategory } from "@/services/types/habits";
import {
  formatDate,
  parseApiDate,
  startOfToday,
  toApiDate,
} from "@/utils/date";

// Valores já validados, no formato da API
export interface HabitFormValues {
  name: string;
  category: HabitCategory;
  description: string | null;
  is_public: boolean;
  target_end_date: string | null;
}

export interface HabitFormProps {
  initialValues?: Partial<HabitFormValues>;
  /** Primeiro dia aceito no calendário. Padrão: hoje. */
  minimumDate?: Date;
  submitLabel: string;
  submittingLabel: string;
  /** Chamado com os valores válidos. Se lançar erro, o formulário o exibe. */
  onSubmit: (values: HabitFormValues) => Promise<void>;
}

type FieldErrors = {
  name?: string;
  category?: string;
  description?: string;
  target_end_date?: string;
};

export default function HabitForm({
  initialValues,
  minimumDate,
  submitLabel,
  submittingLabel,
  onSubmit,
}: HabitFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [category, setCategory] = useState<HabitCategory | null>(
    initialValues?.category ?? null,
  );
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  );
  const [isPublic, setIsPublic] = useState(initialValues?.is_public ?? false);
  const [targetEndDate, setTargetEndDate] = useState<Date | null>(
    initialValues?.target_end_date
      ? parseApiDate(initialValues.target_end_date)
      : null,
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const minimum = minimumDate ?? startOfToday();

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
      await onSubmit({
        name: trimmedName,
        category,
        description: trimmedDescription || null,
        is_public: isPublic,
        target_end_date: targetEndDate ? toApiDate(targetEndDate) : null,
      });
    } catch (err: unknown) {
      // Erros por campo (422) vão embaixo de cada campo; o resto vai na faixa
      const { [FORM_ERROR_KEY]: formError, ...apiFieldErrors } =
        getFieldErrors(err);
      setFieldErrors(apiFieldErrors);
      if (formError) {
        setErrorMessage(formError);
      } else if (Object.keys(apiFieldErrors).length === 0) {
        setErrorMessage(getErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
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
                {targetEndDate ? formatDate(targetEndDate) : "Escolher data"}
              </Text>
            </Pressable>
            {targetEndDate && (
              <Pressable onPress={() => setTargetEndDate(null)}>
                <Text style={styles.removeDateText}>Remover</Text>
              </Pressable>
            )}
          </View>
          {fieldErrors.target_end_date && (
            <Text style={styles.errorText}>{fieldErrors.target_end_date}</Text>
          )}
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={targetEndDate ?? minimum}
            mode="date"
            minimumDate={minimum}
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
          {submitting ? submittingLabel : submitLabel}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
