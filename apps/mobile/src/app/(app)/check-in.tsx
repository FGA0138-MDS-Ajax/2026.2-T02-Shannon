import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LogoutButton from "@/components/logout-button";
import { theme } from "@/config/theme";

export default function CheckInScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Check-in</Text>
        <LogoutButton />
      </View>
      <Text style={styles.subtitle}>
        Em breve você poderá registrar seus check-ins por aqui.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: theme.colors.gray,
  },
  header: {
    marginTop: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: theme.font.bold,
    fontSize: 28,
    color: "#1C1917",
  },
  subtitle: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: "#6B6560",
    lineHeight: 22,
  },
});
