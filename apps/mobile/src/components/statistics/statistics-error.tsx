import { Lucide } from "@react-native-vector-icons/lucide";
import { StyleSheet, Text, View } from "react-native";
import Button from "@/components/button";
import { theme } from "@/config/theme";
import { palette } from "./palette";

export interface StatisticsErrorProps {
  message?: string;
  onRetry: () => void;
}

export default function StatisticsError({
  message,
  onRetry,
}: StatisticsErrorProps) {
  return (
    <View testID="statistics-error" style={styles.container}>
      <View style={styles.card} accessibilityRole="alert">
        <Lucide name="wifi-off" size={28} color={palette.riskText} />
        <Text style={styles.title}>Não foi possível carregar o painel</Text>
        <Text style={styles.message}>
          {message ?? "Verifique sua conexão e tente de novo."}
        </Text>
        <Button onPress={onRetry}>Tentar novamente</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 22,
  },
  card: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    alignItems: "center",
    gap: 10,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.primary,
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: theme.font.semiBold,
    fontSize: 17,
    color: palette.ink,
    textAlign: "center",
  },
  message: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: palette.inkSoft,
    textAlign: "center",
    marginBottom: 6,
  },
});
