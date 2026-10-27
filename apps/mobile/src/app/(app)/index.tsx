import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/config/theme";
import { useSession } from "@/hooks/useSession";

export default function HabitsScreen() {
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Meus hábitos</Text>
        <Pressable
          onPress={handleLogout}
          disabled={loggingOut}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>
            {loggingOut ? "Saindo..." : "Sair"}
          </Text>
        </Pressable>
      </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: theme.font.bold,
    fontSize: 28,
    color: "#1C1917",
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  logoutText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.primaryDark,
  },
});
