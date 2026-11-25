import { ScrollView, StyleSheet } from "react-native";
import StatisticsPanel from "@/components/statistics-panel";
import { Screen } from "@/components/ui";

export default function Home() {
  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <StatisticsPanel />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
});
