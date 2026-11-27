import { Lucide } from "@react-native-vector-icons/lucide";
import { useTransition } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "@/components/button";
import {
  Avatar,
  Card,
  InfoRow,
  Loading,
  Screen,
  ScreenHeader,
} from "@/components/ui";
import { theme } from "@/config/theme";
import { useSession } from "@/hooks/useSession";

export default function UserScreen() {
  const { user, signOut } = useSession();
  const [isLoggingOut, startLoggingOut] = useTransition();

  const handleLogout = () => {
    startLoggingOut(async () => {
      await signOut();
    });
  };

  if (!user) {
    return (
      <Screen>
        <Loading fill />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Usuário" />

        <Card style={styles.profile}>
          <Avatar name={user.name || "U"} size={72} />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.username}>@{user.username}</Text>
        </Card>

        <Card style={styles.account}>
          <Text style={styles.cardTitle}>Informações da conta</Text>
          <View testID="user-name-row">
            <InfoRow label="Nome" value={user.name} />
          </View>
          <View testID="user-email-row">
            <InfoRow label="E-mail" value={user.email} />
          </View>
          <View testID="user-username-row">
            <InfoRow label="Nome de usuário" value={user.username} last />
          </View>
        </Card>

        <Button
          testID="logout-button"
          width="full"
          onPress={handleLogout}
          disabled={isLoggingOut}
          prefix={
            <Lucide name="log-out" size={18} color={theme.colors.surface} />
          }
        >
          Sair
        </Button>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 24,
  },
  profile: {
    alignItems: "center",
    paddingVertical: 24,
    marginBottom: 16,
    gap: 4,
  },
  name: {
    marginTop: 8,
    fontFamily: theme.font.bold,
    fontSize: 20,
    color: theme.colors.text,
    textAlign: "center",
  },
  username: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: "center",
  },
  account: {
    marginBottom: 24,
  },
  cardTitle: {
    fontFamily: theme.font.semiBold,
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 4,
  },
});
