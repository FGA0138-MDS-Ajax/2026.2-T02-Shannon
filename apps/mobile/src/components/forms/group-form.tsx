import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "@/components/button";
import DateField from "@/components/date-field";
import Input from "@/components/input";
import { ErrorBanner } from "@/components/ui";
import {
  rankingCriterionHints,
  rankingCriterionLabels,
} from "@/config/group-labels";
import { theme } from "@/config/theme";
import { getFormErrors } from "@/services/api-errors";
import type { RankingCriterion } from "@/services/types/groups";
import { parseApiDate, toApiDate } from "@/utils/date";

// Valores já validados, no formato da API
export interface GroupFormValues {
  name: string;
  description: string | null;
  ends_on: string | null;
  ranking_criterion: RankingCriterion;
}

export interface GroupFormProps {
  initialValues?: Partial<GroupFormValues>;
  submitLabel: string;
  submittingLabel: string;
  /** Chamado com os valores válidos. Se lançar erro, o formulário o exibe. */
  onSubmit: (values: GroupFormValues) => Promise<void>;
}

type FieldErrors = Partial<Record<keyof GroupFormValues, string>>;

const CRITERIA: RankingCriterion[] = ["check_ins", "goals"];

export function GroupForm({
  initialValues,
  submitLabel,
  submittingLabel,
  onSubmit,
}: GroupFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  );
  const [criterion, setCriterion] = useState<RankingCriterion>(
    initialValues?.ranking_criterion ?? "check_ins",
  );
  const [endsOn, setEndsOn] = useState<Date | null>(
    initialValues?.ends_on ? parseApiDate(initialValues.ends_on) : null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setFormError(null);
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const errors: FieldErrors = {};

    if (!trimmedName) errors.name = "Informe o nome do grupo.";
    else if (trimmedName.length > 100)
      errors.name = "Use no máximo 100 caracteres.";
    if (trimmedDescription.length > 500)
      errors.description = "Use no máximo 500 caracteres.";

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setSubmitting(true);
      await onSubmit({
        name: trimmedName,
        description: trimmedDescription || null,
        ends_on: endsOn ? toApiDate(endsOn) : null,
        ranking_criterion: criterion,
      });
    } catch (err: unknown) {
      const result = getFormErrors(err);
      setFieldErrors(result.fieldErrors);
      setFormError(result.formError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {formError && <ErrorBanner message={formError} />}

      <ScrollView keyboardShouldPersistTaps="handled">
        <Input
          testID="group-name-input"
          label="Nome"
          placeholder="ex: Corrida matinal"
          value={name}
          onChangeText={setName}
          autoCapitalize="sentences"
          maxLength={100}
          error={fieldErrors.name}
        />

        <Input
          testID="group-description-input"
          label="Descrição (opcional)"
          placeholder="Qual é o objetivo do grupo?"
          value={description}
          onChangeText={setDescription}
          autoCapitalize="sentences"
          multiline
          maxLength={500}
          error={fieldErrors.description}
        />

        <View style={styles.field}>
          <Text style={styles.label}>Critério do ranking</Text>
          <View style={styles.options} accessibilityRole="radiogroup">
            {CRITERIA.map((value) => {
              const isSelected = value === criterion;
              return (
                <Pressable
                  key={value}
                  testID={`criterion-${value}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setCriterion(value)}
                  style={[styles.option, isSelected && styles.optionSelected]}
                >
                  <Text style={styles.optionTitle}>
                    {rankingCriterionLabels[value]}
                  </Text>
                  <Text style={styles.optionHint}>
                    {rankingCriterionHints[value]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {fieldErrors.ranking_criterion && (
            <Text style={styles.error}>{fieldErrors.ranking_criterion}</Text>
          )}
        </View>

        <DateField
          testID="group-ends-on-button"
          label="Data de término (opcional)"
          placeholder="Sem data de término"
          value={endsOn}
          onChange={setEndsOn}
          error={fieldErrors.ends_on}
        />
      </ScrollView>

      <View style={styles.actions}>
        <Button
          testID="group-submit-button"
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
  field: {
    marginBottom: 16,
  },
  label: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.label,
    marginBottom: 6,
  },
  options: {
    gap: 8,
  },
  option: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 2,
  },
  optionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  optionTitle: {
    fontFamily: theme.font.semiBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  optionHint: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  error: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.colors.dangerStrong,
    marginTop: 4,
  },
  actions: {
    marginTop: 12,
    marginBottom: 16,
  },
});
