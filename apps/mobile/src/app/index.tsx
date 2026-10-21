import { Redirect, router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Button from "@/components/button";
import { theme } from "@/config/theme";
import { useSession } from "@/hooks/useSession";

export default function Index() {
  const { user, isLoading } = useSession();

  if (!isLoading && user) {
    return <Redirect href="/(app)" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.appName}>Habbit</Text>
        <Text style={styles.tagline}>
          Construa hábitos saudáveis e consistentes para transformar sua rotina.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          variant="primary"
          width="full"
          onPress={() => router.push("/(auth)/signup")}
        >
          Criar uma conta
        </Button>
        <Button
          variant="secondary"
          width="full"
          onPress={() => router.push("/(auth)/login")}
        >
          Já tenho uma conta
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    paddingHorizontal: 20,
    paddingVertical: 48,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.gray,
  },
  hero: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  appName: {
    fontFamily: theme.font.bold,
    fontSize: 42,
    color: theme.colors.primary,
    marginBottom: 12,
    textAlign: "center",
  },
  tagline: {
    fontFamily: theme.font.regular,
    fontSize: 16,
    color: "#6B6560",
    textAlign: "center",
    lineHeight: 24,
  },
  actions: {
    display: "flex",
    width: "100%",
    flexDirection: "column",
    gap: 16,
  },
});
