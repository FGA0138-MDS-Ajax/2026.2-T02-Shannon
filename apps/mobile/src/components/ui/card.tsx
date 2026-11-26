import type { ReactNode } from "react";
import {
  Pressable,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { theme } from "@/config/theme";

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  /** Borda laranja: chama atenção para o card (ex.: falta fazer hoje) */
  highlighted?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

// Cartão branco com borda clara, o mesmo das listas de hábitos e check-ins
export function Card({
  children,
  onPress,
  highlighted = false,
  style,
  testID,
  accessibilityLabel,
}: CardProps) {
  const cardStyle = [styles.card, highlighted && styles.highlighted, style];

  if (!onPress) {
    return (
      <View
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        style={cardStyle}
      >
        {children}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  highlighted: {
    borderColor: theme.colors.primary,
  },
  pressed: {
    opacity: 0.8,
  },
});
