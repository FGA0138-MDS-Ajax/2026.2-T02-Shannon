import { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import Button from "@/components/button";
import CategoryPicker from "@/components/category-picker";
import DateField from "@/components/date-field";
import GoalPicker from "@/components/goal-picker";
import Input from "@/components/input";
import { ErrorBanner } from "@/components/ui";
import { theme } from "@/config/theme";
import {
  FORM_ERROR_KEY,
  getErrorMessage,
  getFieldErrors,
} from "@/services/api-errors";
import type { GoalInput, HabitCategory } from "@/services/types/habits";
import { parseApiDate, toApiDate } from "@/utils/date";

// Valores já validados, no formato da API
export interface HabitFormValues {
  name: string;
  category: HabitCategory;
  description: string | null;
  is_public: boolean;
  target_end_date: string | null;
  /** A meta escolhida; `null` quando o formulário não tem o campo (`withGoal`). */
  goal: GoalInput | null;
}

export interface HabitFormProps {
  initialValues?: Partial<HabitFormValues>;
  /** Mostra o campo de meta. Só na criação: a edição de hábito não muda a meta. */
  withGoal?: boolean;
  /** Mostra a chave "Público". Hábito de grupo nunca é público. */
  withVisibility?: boolean;
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
  goal?: string;
  description?: string;
  target_end_date?: string;
};

export function HabitForm({
  initialValues,
  withGoal = false,
  withVisibility = true,
  minimumDate,
  submitLabel,
  submittingLabel,
  onSubmit,
}: HabitFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [category, setCategory] = useState<HabitCategory | null>(
    initialValues?.category ?? null,
  );
  const [goal, setGoal] = useState<GoalInput | null>(
    initialValues?.goal ?? null,
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

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    if (withGoal && !goal) {
      errors.goal = "Escolha o tipo da meta.";
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
        goal: withGoal ? goal : null,
      });
    } catch (err: unknown) {
      // Erros por campo (422) vão embaixo de cada campo; o resto vai na faixa
      const {
        [FORM_ERROR_KEY]: formError,
        period,
        target_count,
        period_end_weekday,
        ...apiFieldErrors
      } = getFieldErrors(err);
      // Erros de dentro da meta (ex.: `target_count`) aparecem no seletor de meta
      const goalError =
        apiFieldErrors.goal ?? period ?? target_count ?? period_end_weekday;
      if (goalError) apiFieldErrors.goal = goalError;
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
      {errorMessage && <ErrorBanner message={errorMessage} />}

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

        {withGoal && (
          <GoalPicker
            label="Meta"
            value={goal}
            onChange={setGoal}
            error={fieldErrors.goal}
          />
        )}

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

        {withVisibility && (
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
        )}

        <DateField
          testID="habit-date-button"
          label="Data final (opcional)"
          value={targetEndDate}
          onChange={setTargetEndDate}
          minimumDate={minimumDate}
          error={fieldErrors.target_end_date}
        />
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
  form: {
    width: "100%",
  },
  label: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.label,
    marginBottom: 6,
  },
  hint: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.colors.muted,
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
  actions: {
    marginTop: 12,
    width: "100%",
  },
});
