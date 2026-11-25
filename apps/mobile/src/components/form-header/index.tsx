import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";

// Título das telas de formulário, com "Cancelar" para voltar sem salvar
export default function FormHeader({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <Pressable onPress={() => router.back()} style={styles.cancelButton}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    flexShrink: 1,
    fontFamily: theme.font.bold,
    fontSize: 28,
    color: palette.ink,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.primaryDark,
  },
});
