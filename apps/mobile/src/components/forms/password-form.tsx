import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Button from "@/components/button";
import Input from "@/components/input";
import { ErrorBanner } from "@/components/ui";
import {
  getPasswordFieldErrors,
  type PasswordField,
} from "@/services/account-errors";
import { getErrorMessage } from "@/services/api-errors";
import type { PasswordChange } from "@/services/types/auth";

export interface PasswordFormProps {
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (body: PasswordChange) => Promise<void>;
}

type FieldErrors = Partial<Record<PasswordField, string>>;

/** Tamanho em bytes do UTF-8, como o limite do bcrypt no back. */
export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

export function validatePasswordFields(values: {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.current_password)
    errors.current_password = "Informe a senha atual.";

  if (values.new_password.length < 8)
    errors.new_password = "Use pelo menos 8 caracteres.";
  else if (utf8ByteLength(values.new_password) > 72)
    errors.new_password = "Use no máximo 72 bytes.";
  else if (values.new_password === values.current_password)
    errors.new_password = "A nova senha deve ser diferente da atual.";

  if (values.new_password_confirmation !== values.new_password)
    errors.new_password_confirmation =
      "A confirmação não confere com a nova senha.";

  return errors;
}

// Formulário de troca de senha. A resposta traz tokens novos: o onSubmit
// precisa substituí-los antes de qualquer outra chamada.
export function PasswordForm({
  submitLabel,
  submittingLabel,
  onSubmit,
}: PasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setFormError(null);

    const values = {
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: confirmation,
    };
    const errors = validatePasswordFields(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setSubmitting(true);
      await onSubmit(values);
    } catch (err: unknown) {
      const apiErrors = getPasswordFieldErrors(err);
      if (Object.keys(apiErrors).length > 0) {
        setFieldErrors(apiErrors);
        return;
      }
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {formError && <ErrorBanner message={formError} />}

      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          testID="password-current-input"
          label="Senha atual"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          error={fieldErrors.current_password}
        />

        <Input
          testID="password-new-input"
          label="Nova senha"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          error={fieldErrors.new_password}
        />

        <Input
          testID="password-confirmation-input"
          label="Confirmar nova senha"
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry
          error={fieldErrors.new_password_confirmation}
        />
      </ScrollView>

      <View style={styles.actions}>
        <Button
          testID="password-submit-button"
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
    paddingVertical: 16,
  },
  actions: {
    paddingVertical: 12,
  },
});
