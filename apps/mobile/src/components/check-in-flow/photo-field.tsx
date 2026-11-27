import { Lucide } from "@react-native-vector-icons/lucide";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { theme } from "@/config/theme";

export interface PhotoFieldProps {
  /** Foto já preparada, ainda só no celular */
  uri: string | null;
  preparing: boolean;
  error: string | null;
  disabled: boolean;
  onChoose: () => void;
  onRemove: () => void;
}

// Foto opcional do check-in novo: ela só sobe depois que o check-in é salvo
export default function PhotoField({
  uri,
  preparing,
  error,
  disabled,
  onChoose,
  onRemove,
}: PhotoFieldProps) {
  const renderBody = () => {
    if (preparing) {
      return (
        <View style={styles.row}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.hint}>Preparando a foto...</Text>
        </View>
      );
    }

    if (uri) {
      return (
        <View style={styles.row}>
          <Image
            testID="photo-field-preview"
            source={{ uri }}
            contentFit="cover"
            style={styles.preview}
          />
          <Pressable onPress={onChoose} disabled={disabled} hitSlop={8}>
            <Text style={styles.link}>Trocar</Text>
          </Pressable>
          <Pressable onPress={onRemove} disabled={disabled} hitSlop={8}>
            <Text style={[styles.link, styles.remove]}>Remover</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <Pressable
        testID="photo-field-add"
        accessibilityRole="button"
        onPress={onChoose}
        disabled={disabled}
        style={({ pressed }) => [styles.add, pressed && styles.pressed]}
      >
        <Lucide name="camera" size={18} color={theme.colors.primaryDark} />
        <Text style={styles.link}>Adicionar foto</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Foto (opcional)</Text>
      {renderBody()}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    gap: 6,
  },
  label: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.label,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  preview: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.gray200,
  },
  add: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.radius.md,
  },
  pressed: {
    opacity: 0.6,
  },
  hint: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
  link: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.primaryDark,
  },
  remove: {
    color: theme.colors.danger,
  },
  error: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.colors.dangerStrong,
  },
});
