import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "@/components/button";
import { ErrorBanner, Screen, ScreenHeader } from "@/components/ui";
import { theme } from "@/config/theme";

export interface AuthLayoutProps {
  title: string;
  subtitle: string;
  error: string | null;
  /** Campos do formulário */
  children: ReactNode;
  submitLabel: string;
  submittingLabel: string;
  submitting: boolean;
  onSubmit: () => void;
  /** Link para a outra tela de autenticação: "Não tem uma conta? Cadastre-se" */
  footer: { text: string; linkLabel: string; onPress: () => void };
}

// Estrutura comum das telas de login e cadastro
export default function AuthLayout({
  title,
  subtitle,
  error,
  children,
  submitLabel,
  submittingLabel,
  submitting,
  onSubmit,
  footer,
}: AuthLayoutProps) {
  return (
    <Screen keyboardAvoiding maxWidth="form">
      <ScreenHeader title={title} subtitle={subtitle} />

      {error && <ErrorBanner message={error} />}

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>

      <View style={styles.actions}>
        <Button width="full" onPress={onSubmit} disabled={submitting}>
          {submitting ? submittingLabel : submitLabel}
        </Button>

        <Pressable onPress={footer.onPress} style={styles.footerLink}>
          <Text style={styles.footerText}>
            {footer.text}{" "}
            <Text style={styles.footerLinkText}>{footer.linkLabel}</Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    flex: 1,
  },
  actions: {
    marginTop: 12,
    alignItems: "center",
  },
  footerLink: {
    marginTop: 12,
    paddingVertical: 8,
  },
  footerText: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  footerLinkText: {
    fontFamily: theme.font.semiBold,
    color: theme.colors.primary,
  },
});
