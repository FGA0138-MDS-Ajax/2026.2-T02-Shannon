import { ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "@/components/button";
import {
  type CheckInFieldErrors,
  CheckInFields,
  type CheckInFieldValues,
} from "@/components/forms/check-in-fields";
import { ErrorBanner } from "@/components/ui";
import { theme } from "@/config/theme";
import PhotoField, { type PhotoFieldProps } from "./photo-field";

export interface DetailsStepProps {
  values: CheckInFieldValues;
  errors: CheckInFieldErrors;
  formError: string | null;
  habitCount: number;
  submitting: boolean;
  onChange: (values: CheckInFieldValues) => void;
  onSubmit: () => void;
  photo: Omit<PhotoFieldProps, "disabled">;
}

// Etapa 3: título, descrição, duração e a foto opcional do check-in
export default function DetailsStep({
  values,
  errors,
  formError,
  habitCount,
  submitting,
  onChange,
  onSubmit,
  photo,
}: DetailsStepProps) {
  return (
    <>
      {formError && <ErrorBanner message={formError} />}

      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <CheckInFields values={values} errors={errors} onChange={onChange} />
        <PhotoField {...photo} disabled={submitting} />
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.count}>
          {habitCount} {habitCount === 1 ? "hábito" : "hábitos"}
        </Text>
        <Button
          testID="submit-button"
          // Travado durante o envio para não criar check-in duplicado
          disabled={submitting || photo.preparing}
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
