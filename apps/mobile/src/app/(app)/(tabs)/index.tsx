import { router } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import Button from "@/components/button";
import StatisticsPanel from "@/components/statistics-panel";
import { FloatingAction, Screen } from "@/components/ui";

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

      {/* Atalho para o check-in sem passar pela aba Check-in */}
      <FloatingAction>
        <Button
          testID="home-check-in-button"
          width="full"
          onPress={() => router.push("/check-ins/create")}
        >
          Check-in
        </Button>
      </FloatingAction>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 96,
  },
});
