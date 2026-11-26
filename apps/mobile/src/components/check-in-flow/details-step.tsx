import { ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "@/components/button";
import {
  type CheckInFieldErrors,
  CheckInFields,
  type CheckInFieldValues,
} from "@/components/forms/check-in-fields";
import { ErrorBanner } from "@/components/ui";
import { theme } from "@/config/theme";

export interface DetailsStepProps {
  values: CheckInFieldValues;
  errors: CheckInFieldErrors;
  formError: string | null;
  habitCount: number;
  submitting: boolean;
  onChange: (values: CheckInFieldValues) => void;
  onSubmit: () => void;
}

// Etapa 3: título, descrição e duração do check-in
export default function DetailsStep({
  values,
  errors,
  formError,
  habitCount,
  submitting,
  onChange,
  onSubmit,
}: DetailsStepProps) {
  return (
    <>
      {formError && <ErrorBanner message={formError} />}

      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <CheckInFields values={values} errors={errors} onChange={onChange} />
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.count}>
          {habitCount} {habitCount === 1 ? "hábito" : "hábitos"}
        </Text>
        <Button
          testID="submit-button"
          // Travado durante o envio para não criar check-in duplicado
          disabled={submitting}
          onPress={onSubmit}
        >
          {submitting ? "Enviando..." : "Enviar"}
        </Button>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  form: {
    paddingVertical: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  count: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
});
