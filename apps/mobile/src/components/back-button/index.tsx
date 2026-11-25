import { Lucide } from "@react-native-vector-icons/lucide";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { theme } from "@/config/theme";

export default function BackButton() {
  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      style={styles.button}
    >
      <Lucide name="arrow-left" size={16} color={theme.colors.primaryDark} />
      <Text style={styles.text}>Voltar</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 8,
    marginBottom: 16,
    alignSelf: "flex-start",
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  text: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.primaryDark,
  },
});
