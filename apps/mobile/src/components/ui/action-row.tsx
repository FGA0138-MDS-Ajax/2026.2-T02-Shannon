import { Lucide } from "@react-native-vector-icons/lucide";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/config/theme";

export interface ActionRowProps {
  icon: ComponentProps<typeof Lucide>["name"];
  title: string;
  description: string;
  onPress: () => void;
  /** Ação destrutiva: ícone e título em vermelho */
  destructive?: boolean;
  disabled?: boolean;
  testID?: string;
}

// Botão de ação da tela de detalhe: ícone, título e uma linha explicando
export function ActionRow({
  icon,
  title,
  description,
  onPress,
  destructive = false,
  disabled = false,
  testID,
}: ActionRowProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.row,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <View style={styles.titleRow}>
        <Lucide
          name={icon}
          size={16}
          color={destructive ? theme.colors.danger : theme.colors.text}
        />
        <Text style={[styles.title, destructive && styles.destructive]}>
          {title}
        </Text>
      </View>
      <Text style={styles.description}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pressed: {
    opacity: 0.8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontFamily: theme.font.bold,
    fontSize: 16,
    color: theme.colors.text,
  },
  description: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
  destructive: {
    color: theme.colors.danger,
  },
});
