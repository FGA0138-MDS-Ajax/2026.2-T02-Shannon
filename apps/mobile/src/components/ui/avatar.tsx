import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/config/theme";

export interface AvatarProps {
  name: string;
  size?: number;
  /** Cor do integrante no grupo (ver `memberColors`): fundo cheio, letra branca */
  color?: string;
  /** Anel escuro em volta: destaca o próprio usuário em listas */
  highlighted?: boolean;
}

// Círculo com a inicial do nome
export function Avatar({
  name,
  size = 36,
  color,
  highlighted = false,
}: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        color ? { backgroundColor: color } : null,
        highlighted && styles.highlighted,
      ]}
    >
      <Text
        style={[
          styles.initial,
          { fontSize: size * 0.4 },
          !!color && styles.initialOnColor,
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
    borderWidth: 2,
    borderColor: theme.colors.text,
  },
  initial: {
    fontFamily: theme.font.bold,
    color: theme.colors.primaryDark,
  },
  initialOnColor: {
    color: theme.colors.surface,
  },
});
