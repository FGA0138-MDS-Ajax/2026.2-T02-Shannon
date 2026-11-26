import type { ReactNode } from "react";
import {
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { theme } from "@/config/theme";

export interface SectionHeaderProps {
  title: string;
  /** Contador ao lado do título (ex.: quantidade de check-ins do dia) */
  count?: number | string;
  /** Link de texto à direita (ex.: "Ver todos") */
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({
  title,
  count,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {count !== undefined && (
          <View style={styles.counter}>
            <Text style={styles.counterText}>{count}</Text>
          </View>
        )}
      </View>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Section({
  children,
  style,
  ...header
}: SectionHeaderProps & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.section, style]}>
      <SectionHeader {...header} />
      <View style={styles.body}>{children}</View>
    </View>
  );
}

export interface InfoRowProps {
  label: string;
  value: string;
  last?: boolean;
}

// Linha "rótulo ... valor" com divisória, usada nos detalhes
export function InfoRow({ label, value, last = false }: InfoRowProps) {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
  },
  body: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flexShrink: 1,
    fontFamily: theme.font.bold,
    fontSize: 18,
    color: theme.colors.text,
  },
  counter: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  counterText: {
    fontFamily: theme.font.medium,
    fontSize: 12,
    color: theme.colors.label,
  },
  action: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.primaryDark,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
  infoValue: {
    flexShrink: 1,
    textAlign: "right",
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.text,
  },
});
