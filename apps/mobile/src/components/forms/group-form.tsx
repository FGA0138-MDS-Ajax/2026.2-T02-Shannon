import { Lucide } from "@react-native-vector-icons/lucide";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "@/components/button";
import DateField from "@/components/date-field";
import Input from "@/components/input";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import { ApiError } from "@/services/api";
import {
  FORM_ERROR_KEY,
  getErrorMessage,
  getFieldErrors,
} from "@/services/api-errors";
import type { RankingCriterion } from "@/services/types/groups";
import { parseApiDate, startOfToday, toApiDate } from "@/utils/date";

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

const CRITERIA: { value: RankingCriterion; title: string; hint: string }[] = [
  {
    value: "check_ins",
    title: "Dias com check-in",
    hint: "Ganha quem fizer check-in em mais dias.",
  },
  {
    value: "goals",
    title: "Metas batidas",
    hint: "Ganha quem cumprir mais metas dos hábitos do grupo.",
  },
];

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
  const [endsOn, setEndsOn] = useState<Date | null>(
    initialValues?.ends_on ? parseApiDate(initialValues.ends_on) : null,
  );
  const [criterion, setCriterion] = useState<RankingCriterion | null>(
    initialValues?.ranking_criterion ?? null,
  );

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    const trimmedName = name.trim();

    if (!trimmedName) errors.name = "Informe o nome do grupo.";
    else if (trimmedName.length > 100)
      errors.name = "Use no máximo 100 caracteres.";

    if (description.trim().length > 500)
      errors.description = "Use no máximo 500 caracteres.";

    if (!criterion) errors.ranking_criterion = "Escolha como o ranking conta.";

    return errors;
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !criterion) return;

    try {
      setSubmitting(true);
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        ends_on: endsOn ? toApiDate(endsOn) : null,
        ranking_criterion: criterion,
      });
    } catch (err: unknown) {
      const { [FORM_ERROR_KEY]: formError, ...apiFieldErrors } =
        getFieldErrors(err);

      // As regras da data de fim voltam como 422 com o texto no `detail`
      if (
        err instanceof ApiError &&
        err.status === 422 &&
        Object.keys(apiFieldErrors).length === 0 &&
        !formError
      ) {
        setFieldErrors({ ends_on: getErrorMessage(err) });
        return;
      }

      setFieldErrors(apiFieldErrors);
      if (formError || Object.keys(apiFieldErrors).length === 0) {
        setErrorMessage(formError ?? getErrorMessage(err));
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
          testID="group-name-input"
          label="Nome"
          placeholder="ex: Pedal de domingo"
          value={name}
          onChangeText={setName}
          autoCapitalize="sentences"
          maxLength={100}
          error={fieldErrors.name}
        />

        <Input
          testID="group-description-input"
          label="Descrição (opcional)"
          placeholder="Sobre o que é o grupo"
          value={description}
          onChangeText={setDescription}
          autoCapitalize="sentences"
          multiline
          maxLength={500}
          error={fieldErrors.description}
        />

        <DateField
          testID="group-ends-on-button"
          label="Data de fim (opcional)"
          value={endsOn}
          onChange={setEndsOn}
          minimumDate={startOfToday()}
          error={fieldErrors.ends_on}
        />

        <Text style={styles.label}>Como o ranking conta</Text>
        <View accessibilityRole="radiogroup" style={styles.criteria}>
          {CRITERIA.map((option) => {
            const selected = option.value === criterion;
            return (
              <Pressable
                key={option.value}
                testID={`criterion-${option.value}`}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setCriterion(option.value)}
                style={[styles.criterion, selected && styles.criterionSelected]}
              >
                <View style={styles.criterionTexts}>
                  <Text style={styles.criterionTitle}>{option.title}</Text>
                  <Text style={styles.hint}>{option.hint}</Text>
                </View>
                {selected && (
                  <Lucide name="check" size={20} color={theme.colors.primary} />
                )}
              </Pressable>
            );
          })}
        </View>
        {fieldErrors.ranking_criterion && (
          <Text style={styles.errorText}>{fieldErrors.ranking_criterion}</Text>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Button width="full" onPress={handleSubmit} disabled={submitting}>
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
    backgroundColor: palette.riskBackground,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: palette.riskText,
  },
  form: {
    width: "100%",
  },
  label: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: palette.ink,
    marginBottom: 6,
  },
  criteria: {
    gap: 8,
  },
  criterion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.gray100,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    borderRadius: 12,
    padding: 14,
  },
  criterionSelected: {
    borderColor: theme.colors.primary,
  },
  criterionTexts: {
    flex: 1,
    gap: 4,
  },
  criterionTitle: {
    fontFamily: theme.font.semiBold,
    fontSize: 16,
    color: palette.ink,
  },
  hint: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    lineHeight: 18,
    color: palette.inkSoft,
  },
  errorText: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: palette.riskText,
    marginTop: 4,
  },
  actions: {
    marginTop: 12,
    width: "100%",
  },
});
