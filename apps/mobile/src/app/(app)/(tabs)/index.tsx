import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/config/theme";

export default function Home() {
  return (
    <SafeAreaView style={styles.container}>
      <Text>Home</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: theme.colors.gray,
  },
});
