import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/config/theme";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger";

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  testID?: string;
}

/** Cores de cada tom, para outros quadros de status seguirem a mesma escala */
export const badgeTones: Record<
  BadgeTone,
  { background: string; text: string }
> = {
  neutral: {
    background: theme.colors.border,
    text: theme.colors.textSecondary,
  },
  primary: {
    background: theme.colors.primarySoft,
    text: theme.colors.primaryDark,
  },
  success: { background: theme.colors.successSoft, text: theme.colors.success },
  warning: { background: theme.colors.warningSoft, text: theme.colors.warning },
  danger: { background: theme.colors.dangerSoft, text: theme.colors.danger },
};

// Etiqueta arredondada de status (ex.: "Ativo", "Encerrado", "Admin")
export function Badge({ label, tone = "neutral", testID }: BadgeProps) {
  const colors = badgeTones[tone];
  return (
    <View
      testID={testID}
      style={[styles.badge, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: theme.radius.pill,
    paddingVertical: 2,
    paddingHorizontal: 10,
  },
  text: {
    fontFamily: theme.font.medium,
    fontSize: 12,
  },
});
