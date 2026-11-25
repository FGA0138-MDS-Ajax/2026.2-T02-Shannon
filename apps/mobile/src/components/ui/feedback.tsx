import { Lucide } from "@react-native-vector-icons/lucide";
import type { ComponentProps } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Button from "@/components/button";
import { theme } from "@/config/theme";

type IconName = ComponentProps<typeof Lucide>["name"];

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  testID?: string;
}

// Faixa vermelha de erro, com "Tentar novamente" opcional
export function ErrorBanner({ message, onRetry, testID }: ErrorBannerProps) {
  return (
    <View testID={testID} style={styles.errorBanner} accessibilityRole="alert">
      <Text style={styles.errorText}>{message}</Text>
      {onRetry && (
        <Button variant="secondary" onPress={onRetry}>
          Tentar novamente
        </Button>
      )}
    </View>
  );
}

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  message?: string;
  testID?: string;
}

// Cartão de lista vazia, o mesmo da aba de check-ins
export function EmptyState({ icon, title, message, testID }: EmptyStateProps) {
  return (
    <View testID={testID} style={styles.empty}>
      <Lucide name={icon} size={36} color={theme.colors.subtle} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {message && <Text style={styles.emptyMessage}>{message}</Text>}
    </View>
  );
}

export function Loading({
  testID,
  fill = false,
}: {
  testID?: string;
  /** Ocupa o espaço que sobrar e centraliza (tela inteira carregando) */
  fill?: boolean;
}) {
  return (
    <View style={fill ? styles.fill : styles.inline}>
      <ActivityIndicator
        testID={testID}
        size="large"
        color={theme.colors.primary}
      />
    </View>
  );
}

// Texto centralizado para tela sem conteúdo (ex.: "Hábito não encontrado.")
export function CenteredMessage({ message }: { message: string }) {
  return (
    <View style={styles.fill}>
      <Text style={styles.centeredText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    backgroundColor: theme.colors.dangerSoft,
    borderWidth: 1,
    borderColor: theme.colors.dangerBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.danger,
    textAlign: "center",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: theme.font.semiBold,
    fontSize: 16,
    color: theme.colors.text,
    marginTop: 4,
    textAlign: "center",
  },
  emptyMessage: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  inline: {
    paddingVertical: 32,
    alignItems: "center",
  },
  fill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centeredText: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 22,
  },
});
