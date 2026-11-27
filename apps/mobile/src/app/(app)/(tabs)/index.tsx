import { StyleSheet, View } from "react-native";
import StatisticsPanel from "@/components/statistics-panel";
import { theme } from "@/config/theme";

export default function Home() {
  return (
    <View style={styles.container}>
      <StatisticsPanel />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.hero,
  },
});
