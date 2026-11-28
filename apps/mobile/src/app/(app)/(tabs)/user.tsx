import { Lucide } from "@react-native-vector-icons/lucide";
import { router } from "expo-router";
import { useTransition } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import useSWR from "swr";
import Button from "@/components/button";
import {
  ActionRow,
  Avatar,
  Card,
  ErrorBanner,
  InfoRow,
  Loading,
  Screen,
  ScreenHeader,
  StatTile,
} from "@/components/ui";
import { theme } from "@/config/theme";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { useSession } from "@/hooks/useSession";
import { getErrorMessage } from "@/services/api-errors";
import { authKeys, getProfile } from "@/services/auth-api";
import type { UserProfile } from "@/services/types/auth";

export default function UserScreen() {
  const { user, signOut } = useSession();
  const [isLoggingOut, startLoggingOut] = useTransition();

  const {
    data: profile,
    error: profileError,
    mutate: refreshProfile,
  } = useSWR<UserProfile>(authKeys.profile, getProfile);

  // A aba fica montada: ao voltar de outra tela, os números são recarregados.
  useRefreshOnFocus(refreshProfile);

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

  const streak = profile?.activity_streak ?? { current: 0, best: 0 };
  const checkInsTotal = profile?.check_ins_total ?? 0;

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

        {profileError && (
          <View style={styles.error}>
            <ErrorBanner
              message={getErrorMessage(profileError)}
              onRetry={() => refreshProfile()}
            />
          </View>
        )}

        <Card testID="profile-summary" style={styles.summary}>
          <Text style={styles.cardTitle}>Resumo</Text>
          <View style={styles.stats}>
            <StatTile
              testID="profile-current-streak"
              label="Sequência atual"
              value={streak.current}
              footer={streak.current === 1 ? "dia" : "dias"}
            />
            <StatTile
              testID="profile-best-streak"
              label="Melhor sequência"
              value={streak.best}
              footer={streak.best === 1 ? "dia" : "dias"}
            />
            <StatTile
              testID="profile-check-ins-total"
              label="Check-ins"
              value={checkInsTotal}
              footer="no total"
            />
          </View>
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

        <View style={styles.actions}>
          <ActionRow
            testID="edit-account-button"
            icon="edit-2"
            title="Editar conta"
            description="Nome, nome de usuário e e-mail"
            onPress={() => router.push("/account/edit")}
          />
          <ActionRow
            testID="change-password-button"
            icon="key"
            title="Alterar senha"
            description="Trocar sua senha de acesso"
            onPress={() => router.push("/account/password")}
          />
        </View>

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
  error: {
    marginBottom: 16,
  },
  summary: {
    marginBottom: 16,
  },
  stats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  account: {
    marginBottom: 16,
  },
  actions: {
    marginBottom: 24,
    gap: 8,
  },
  cardTitle: {
    fontFamily: theme.font.semiBold,
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 4,
  },
});
