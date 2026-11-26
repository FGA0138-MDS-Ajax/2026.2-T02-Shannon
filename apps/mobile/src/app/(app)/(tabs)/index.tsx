import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import Button from "@/components/button";
import StatisticsPanel from "@/components/statistics-panel";
import { FloatingAction } from "@/components/ui";
import { theme } from "@/config/theme";

export default function Home() {
  return (
    <View style={styles.container}>
      <StatisticsPanel />

      {/* Atalho para o check-in sem passar pela aba Check-in */}
      <FloatingAction>
        <Button
          testID="home-check-in-button"
          width="full"
          onPress={() => router.push("/check-ins/create")}
        >
          Novo check-in
        </Button>
      </FloatingAction>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.hero,
  },
});
