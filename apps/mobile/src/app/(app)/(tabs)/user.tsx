import { Lucide } from "@react-native-vector-icons/lucide";
import { useTransition } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "@/components/button";
import { theme } from "@/config/theme";
import { useSession } from "@/hooks/useSession";

export default function UserScreen() {
  const { user, signOut } = useSession();
  const [isLoggingOut, startLoggingOut] = useTransition();

  const handleLogout = async () => {
    startLoggingOut(async () => {
      await signOut();
    });
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const initial = user.name ? user.name.trim().charAt(0).toUpperCase() : "U";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Usuário</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileUsername}>@{user.username}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informações da conta</Text>

          <View style={styles.infoRow} testID="user-name-row">
            <Text style={styles.infoLabel}>Nome</Text>
            <Text style={styles.infoValue}>{user.name}</Text>
          </View>

          <View style={styles.infoRow} testID="user-email-row">
            <Text style={styles.infoLabel}>E-mail</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>

          <View
            style={[styles.infoRow, styles.lastInfoRow]}
            testID="user-username-row"
          >
            <Text style={styles.infoLabel}>Nome de usuário</Text>
            <Text style={styles.infoValue}>{user.username}</Text>
          </View>
        </View>

        <Button
          testID="logout-button"
          variant="primary"
          width="full"
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoggingOut}
          prefix={<Lucide name="log-out" size={18} color="#FFFFFF" />}
        >
          Sair
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  header: {
    marginTop: 16,
    marginBottom: 20,
  },
  title: {
    fontFamily: theme.font.bold,
    fontSize: 28,
    color: "#1C1917",
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7E2DE",
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FDE7DD",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontFamily: theme.font.bold,
    fontSize: 28,
    color: theme.colors.primaryDark,
  },
  profileName: {
    fontFamily: theme.font.bold,
    fontSize: 20,
    color: "#1C1917",
    textAlign: "center",
    marginBottom: 4,
  },
  profileUsername: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: "#6B6560",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7E2DE",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  cardTitle: {
    fontFamily: theme.font.semiBold,
    fontSize: 15,
    color: "#1C1917",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E7E2DE",
  },
  lastInfoRow: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: "#6B6560",
  },
  infoValue: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: "#1C1917",
    maxWidth: "60%",
    textAlign: "right",
  },
  actions: {
    marginTop: "auto",
    marginBottom: 16,
  },
  logoutButton: {
    marginHorizontal: 0,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
