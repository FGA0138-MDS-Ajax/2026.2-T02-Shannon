import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Button from "@/components/button";
import { ErrorBanner } from "@/components/ui";
import { getFormErrors } from "@/services/api-errors";
import { updateCheckIn } from "@/services/check-ins-api";
import type { CheckIn, CheckInUpdate } from "@/services/types/habits";
import { isoDurationToMinutes } from "@/utils/duration";
import {
  type CheckInFieldErrors,
  CheckInFields,
  type CheckInFieldValues,
  validateCheckInFields,
} from "./check-in-fields";

function durationToText(duration: string | null): string {
  const minutes = duration ? isoDurationToMinutes(duration) : null;
  return minutes ? String(minutes) : "";
}

export function CheckInEditForm({ checkIn }: { checkIn: CheckIn }) {
  const initialDuration = durationToText(checkIn.duration);
  const [values, setValues] = useState<CheckInFieldValues>({
    title: checkIn.title,
    description: checkIn.description ?? "",
    duration: initialDuration,
  });
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<CheckInFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setFormError(null);
    const { errors, valid } = validateCheckInFields(values);
    setFieldErrors(errors ?? {});
    if (!valid) return;

    // A API aceita só os campos alterados; `null` limpa descrição e duração
    const changes: CheckInUpdate = {};
    if (valid.title !== checkIn.title) changes.title = valid.title;
    if (valid.description !== checkIn.description)
      changes.description = valid.description;
    // Compara com o texto inicial: a API pode guardar segundos que o campo não mostra
    if (values.duration.trim() !== initialDuration)
      changes.duration = valid.duration;

    if (Object.keys(changes).length === 0) {
      router.back();
      return;
    }

    try {
      setSubmitting(true);
      await updateCheckIn(checkIn.id, changes);
      router.back();
    } catch (err: unknown) {
      const result = getFormErrors(err);
      setFieldErrors(result.fieldErrors);
      setFormError(result.formError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.form}>
      {formError && <ErrorBanner message={formError} />}

      <ScrollView style={styles.fields} keyboardShouldPersistTaps="handled">
        <CheckInFields
          values={values}
          errors={fieldErrors}
          onChange={setValues}
        />
      </ScrollView>

      <View style={styles.actions}>
        <Button width="full" disabled={submitting} onPress={handleSubmit}>
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
  actions: {
    paddingVertical: 12,
  },
});
