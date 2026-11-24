import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { theme } from "@/config/theme";
import { palette } from "./palette";

// Mesma estrutura do StatisticsContent, com blocos cinza no lugar dos dados
export default function StatisticsSkeleton() {
  return (
    <View
      testID="statistics-skeleton"
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando estatísticas"
    >
      <View style={styles.header}>
        <Text style={styles.loading}>Carregando estatísticas...</Text>
        <Block style={styles.greeting} dark />
        <View style={styles.week}>
          {Array.from({ length: 7 }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: lista fixa, nunca muda de ordem
            <View key={index} style={styles.day}>
              <View style={styles.circle} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.inner}>
          <Block style={styles.title} />
          <Block style={styles.habit} />
          <Block style={styles.habit} />
          <Block style={styles.title} />
          <View style={styles.row}>
            <Block style={styles.highlight} />
            <Block style={styles.highlight} />
          </View>
          <Block style={styles.wide} />
        </View>
      </View>
    </View>
  );
}

function Block({ style, dark = false }: { style: ViewStyle; dark?: boolean }) {
  return <View style={[styles.block, dark && styles.blockDark, style]} />;
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: palette.ink,
    paddingHorizontal: 22,
    paddingTop: 40,
    paddingBottom: 48,
  },
  loading: {
    fontFamily: theme.font.regular,
    fontSize: 11,
    color: palette.headerMuted,
    marginBottom: 12,
  },
  block: {
    backgroundColor: palette.cell,
    borderRadius: 16,
  },
  blockDark: {
    backgroundColor: palette.headerRing,
  },
  greeting: {
    width: 180,
    height: 36,
    marginBottom: 32,
  },
  week: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  day: {
    alignItems: "center",
  },
  circle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.headerRing,
  },
  sheet: {
    marginTop: -22,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: palette.background,
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  inner: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    gap: 12,
  },
  title: {
    width: 140,
    height: 24,
    marginTop: 12,
  },
  habit: {
    height: 134,
    borderRadius: 22,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  highlight: {
    flex: 1,
    height: 122,
    borderRadius: 22,
  },
  wide: {
    height: 88,
    borderRadius: 20,
  },
});
