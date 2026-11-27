import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { theme } from "@/config/theme";

// Mesma estrutura da folha do StatisticsContent, com blocos cinza no lugar
// dos dados (a saudação e a semana já aparecem no cabeçalho escuro)
export default function StatisticsSkeleton() {
  return (
    <View
      testID="statistics-skeleton"
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando estatísticas"
      style={styles.container}
    >
      <Text style={styles.loading}>Carregando estatísticas...</Text>
      <Block style={styles.sectionTitle} />
      <Block style={styles.habit} />
      <Block style={styles.habit} />
      <Block style={styles.sectionTitle} />
      <View style={styles.row}>
        <Block style={styles.tile} />
        <Block style={styles.tile} />
      </View>
    </View>
  );
}

function Block({ style }: { style: ViewStyle }) {
  return <View style={[styles.block, style]} />;
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  block: {
    backgroundColor: theme.colors.gray200,
    borderRadius: theme.radius.lg,
  },
  loading: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  sectionTitle: {
    width: "40%",
    height: 20,
    marginTop: 12,
    borderRadius: theme.radius.sm,
  },
  habit: {
    height: 96,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  tile: {
    flex: 1,
    height: 112,
  },
});
