import { Lucide } from "@react-native-vector-icons/lucide";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/config/theme";
import { palette } from "./palette";

// Usuário sem hábitos nem check-ins: números zerados e um convite para começar
export default function StatisticsEmpty() {
  return (
    <View testID="statistics-empty" style={styles.container}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <Lucide name="sprout" size={28} color={palette.ink} />
        </View>
        <Text style={styles.title}>Tudo pronto para começar</Text>
        <Text style={styles.message}>
          Faça seu primeiro check-in para ver suas estatísticas.
        </Text>

        <View style={styles.zeros}>
          <Zero label="hábitos" />
          <Zero label="check-ins" />
          <Zero label="dias seguidos" />
        </View>
      </View>
    </View>
  );
}

function Zero({ label }: { label: string }) {
  return (
    <View style={styles.zero}>
      <Text style={styles.zeroValue}>0</Text>
      <Text style={styles.zeroLabel}>{label}</Text>
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
    borderColor: palette.ink,
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: palette.sage,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: theme.font.semiBold,
    fontSize: 18,
    color: palette.ink,
    textAlign: "center",
  },
  message: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: palette.inkSoft,
    textAlign: "center",
  },
  zeros: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  zero: {
    flex: 1,
    alignItems: "center",
    backgroundColor: palette.background,
    borderRadius: 14,
    paddingVertical: 10,
  },
  zeroValue: {
    fontFamily: theme.font.medium,
    fontSize: 22,
    color: palette.ink,
  },
  zeroLabel: {
    fontFamily: theme.font.regular,
    fontSize: 10,
    color: palette.inkSoft,
  },
});
