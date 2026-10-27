import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { theme } from "@/config/theme";
import { useSession } from "@/hooks/useSession";

export default function LogoutButton() {
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
    <Pressable
      testID="logout-button"
      onPress={handleLogout}
      disabled={loggingOut}
      style={styles.button}
    >
      <Text style={styles.text}>{loggingOut ? "Saindo..." : "Sair"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  text: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.primaryDark,
  },
});
