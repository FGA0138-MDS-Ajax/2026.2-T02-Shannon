import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette } from "@/components/statistics/palette";
import StatisticsPanel from "@/components/statistics-panel";

export default function Home() {
  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <StatisticsPanel />
      </ScrollView>
    </SafeAreaView>
  );
}

// Mesmo fundo das outras abas, inclusive atrás do relógio e da bateria
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    flexGrow: 1,
  },
});
