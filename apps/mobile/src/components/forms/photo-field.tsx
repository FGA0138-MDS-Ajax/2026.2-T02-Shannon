import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import Button from "@/components/button";
import { theme } from "@/config/theme";
import type { PhotoSource } from "@/utils/photo";

export interface PhotoFieldProps {
  previewUri: string | null;
  error?: string | null;
  disabled?: boolean;
  onPick: (source: PhotoSource) => void;
  onRemove: () => void;
}

// Foto opcional na etapa de detalhes do check-in novo
export function PhotoField({
  previewUri,
  error,
  disabled = false,
  onPick,
  onRemove,
}: PhotoFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Foto (opcional)</Text>

      {previewUri && (
        <Image
          testID="check-in-photo-field-preview"
          source={{ uri: previewUri }}
          style={styles.preview}
          contentFit="cover"
        />
      )}

      <View style={styles.buttons}>
        <Button
          testID="photo-field-library"
          variant="secondary"
          disabled={disabled}
          onPress={() => onPick("library")}
        >
          Galeria
        </Button>
        <Button
          testID="photo-field-camera"
          variant="secondary"
          disabled={disabled}
          onPress={() => onPick("camera")}
        >
          Câmera
        </Button>
        {previewUri && (
          <Button
            testID="photo-field-remove"
            variant="outline"
            disabled={disabled}
            onPress={onRemove}
          >
            Remover
          </Button>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.label,
    marginBottom: 6,
  },
  preview: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  buttons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  error: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.colors.dangerStrong,
    marginTop: 4,
  },
});
