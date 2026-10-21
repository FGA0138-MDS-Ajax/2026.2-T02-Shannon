import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Button from "@/components/button";
import { theme } from "@/config/theme";
import { useSession } from "@/hooks/useSession";

export default function HomeScreen() {
  const { signOut } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.footer}>
        <Button
          variant="secondary"
          width="full"
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? "Saindo..." : "Sair da conta"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 32,
    justifyContent: "space-between",
  },
  footer: {
    width: "100%",
  },
});
