import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "@/components/button";
import Input from "@/components/input";
import { ErrorBanner } from "@/components/ui";
import { theme } from "@/config/theme";
import {
  type AccountField,
  getAccountFieldErrors,
} from "@/services/account-errors";
import { getErrorMessage } from "@/services/api-errors";
import type { UserPublic, UserUpdate } from "@/services/types/auth";

export interface AccountFormProps {
  initialValues: UserPublic;
  submitLabel: string;
  submittingLabel: string;
  /** Chamado só com os campos alterados. Se lançar erro, o formulário o exibe. */
  onSubmit: (changes: UserUpdate) => Promise<void>;
}

type FieldErrors = Partial<Record<AccountField, string>>;

const USERNAME_PATTERN = /^[a-z0-9_.]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Só os campos que mudaram; e-mail leva a senha atual junto. */
export function getAccountChanges(
  initial: UserPublic,
  values: { name: string; username: string; email: string },
  currentPassword: string,
): UserUpdate {
  const changes: UserUpdate = {};
  const name = values.name.trim();
  const username = values.username.trim().toLowerCase();
  const email = values.email.trim().toLowerCase();

  if (name !== initial.name) changes.name = name;
  if (username !== initial.username) changes.username = username;
  if (email !== initial.email) {
    changes.email = email;
    changes.current_password = currentPassword;
  }
  return changes;
}

export function validateAccountFields(
  initial: UserPublic,
  values: { name: string; username: string; email: string },
  currentPassword: string,
  usernameConfirmed: boolean,
): FieldErrors {
  const errors: FieldErrors = {};
  const name = values.name.trim();
  const username = values.username.trim().toLowerCase();
  const email = values.email.trim().toLowerCase();

  if (!name) errors.name = "Informe o nome.";
  else if (name.length > 100) errors.name = "Use no máximo 100 caracteres.";

  if (username.length < 3 || username.length > 30)
    errors.username = "Use de 3 a 30 caracteres.";
  else if (!USERNAME_PATTERN.test(username))
    errors.username = "Use apenas letras minúsculas, números, _ e .";

  if (!EMAIL_PATTERN.test(email)) errors.email = "Informe um e-mail válido.";

  if (email !== initial.email && !currentPassword)
    errors.current_password = "Informe a senha atual para trocar o e-mail.";

  if (
    username !== initial.username &&
    !errors.username &&
    !usernameConfirmed
  ) {
    errors.username =
      "Confirme que o username antigo ficará livre para outra pessoa.";
  }

  return errors;
}

// Formulário de edição da conta. Envia só o que mudou, nunca `null`.
export function AccountForm({
  initialValues,
  submitLabel,
  submittingLabel,
  onSubmit,
}: AccountFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [username, setUsername] = useState(initialValues.username);
  const [email, setEmail] = useState(initialValues.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [usernameConfirmed, setUsernameConfirmed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailChanged =
    email.trim().toLowerCase() !== initialValues.email.toLowerCase();
  const usernameChanged =
    username.trim().toLowerCase() !== initialValues.username;

  const handleSubmit = async () => {
    setFormError(null);

    const errors = validateAccountFields(
      initialValues,
      { name, username, email },
      currentPassword,
      usernameConfirmed,
    );
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const changes = getAccountChanges(
      initialValues,
      { name, username, email },
      currentPassword,
    );
    if (Object.keys(changes).length === 0) {
      setFormError("Nenhuma alteração para salvar.");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(changes);
    } catch (err: unknown) {
      const apiErrors = getAccountFieldErrors(err);
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
          testID="account-name-input"
          label="Nome"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          maxLength={100}
          error={fieldErrors.name}
        />

        <Input
          testID="account-username-input"
          label="Nome de usuário"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={30}
          error={fieldErrors.username}
        />

        {usernameChanged && (
          <Pressable
            testID="account-username-confirm"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: usernameConfirmed }}
            onPress={() => setUsernameConfirmed((value) => !value)}
            style={styles.confirm}
          >
            <View
              style={[
                styles.checkbox,
                usernameConfirmed && styles.checkboxChecked,
              ]}
            >
              {usernameConfirmed && <Text style={styles.check}>✓</Text>}
            </View>
            <Text style={styles.confirmText}>
              Entendo que o username antigo ficará livre para outra pessoa.
            </Text>
          </Pressable>
        )}

        <Input
          testID="account-email-input"
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          error={fieldErrors.email}
        />

        {emailChanged && (
          <Input
            testID="account-current-password-input"
            label="Senha atual"
            placeholder="Necessária para trocar o e-mail"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            error={fieldErrors.current_password}
          />
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Button
          testID="account-submit-button"
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
  confirm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
  },
  check: {
    color: theme.colors.surface,
    fontFamily: theme.font.bold,
    fontSize: 14,
  },
  confirmText: {
    flex: 1,
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.colors.label,
  },
  actions: {
    paddingVertical: 12,
  },
});
