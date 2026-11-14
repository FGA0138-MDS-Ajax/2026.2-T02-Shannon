import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import StatisticsPanel from "@/components/statistics-panel";
import { theme } from "@/config/theme";

export default function Home() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Painel</Text>
        <StatisticsPanel />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontFamily: theme.font.bold,
    fontSize: 28,
    marginTop: 16,
    marginBottom: 16,
  },
});
