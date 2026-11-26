import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/config/theme";

export interface AvatarProps {
  name: string;
  size?: number;
  /** Destaca o próprio usuário em listas (ranking, integrantes) */
  highlighted?: boolean;
}

// Círculo com a inicial do nome
export function Avatar({ name, size = 36, highlighted = false }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        highlighted && styles.highlighted,
      ]}
    >
      <Text
        style={[
          styles.initial,
          { fontSize: size * 0.4 },
          highlighted && styles.initialHighlighted,
        ]}
      >
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  highlighted: {
    backgroundColor: theme.colors.primary,
  },
  initial: {
    fontFamily: theme.font.bold,
    color: theme.colors.primaryDark,
  },
  initialHighlighted: {
    color: theme.colors.surface,
  },
});
