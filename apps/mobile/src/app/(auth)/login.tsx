import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "@/components/button";
import Input from "@/components/input";
import { theme } from "@/config/theme";
import { useSession } from "@/hooks/useSession";

export default function LoginScreen() {
  const { signIn } = useSession();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);

    const trimmedLogin = login.trim();
    if (!trimmedLogin) {
      setErrorMessage("Informe seu usuário ou e-mail.");
      return;
    }

    if (!password) {
      setErrorMessage("Informe sua senha.");
      return;
    }

    try {
      setSubmitting(true);
      await signIn({ login: trimmedLogin, password });
      router.replace("/(app)");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Erro ao realizar login.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Acessar conta</Text>
          <Text style={styles.subtitle}>
            Bem-vindo de volta! Entre com seus dados para continuar.
          </Text>
        </View>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}

        <ScrollView style={styles.form}>
          <Input
            label="Usuário ou E-mail"
            placeholder="seu_usuario ou email@exemplo.com"
            value={login}
            onChangeText={setLogin}
            autoComplete="username"
            returnKeyType="next"
          />

          <Input
            label="Senha"
            placeholder="Digite sua senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </ScrollView>
        <View style={styles.actions}>
          <Button
            variant="primary"
            width="full"
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Entrando..." : "Entrar"}
          </Button>

          <Pressable
            onPress={() => router.push("/(auth)/signup")}
            style={styles.footerLink}
          >
            <Text style={styles.footerText}>
              Não tem uma conta?{" "}
              <Text style={styles.footerTextBold}>Cadastre-se</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    height: "100%",
    backgroundColor: theme.colors.gray,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    justifyContent: "center",
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.primaryDark,
  },
  title: {
    fontFamily: theme.font.bold,
    fontSize: 28,
    color: "#1C1917",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: "#6B6560",
    lineHeight: 22,
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorBannerText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: "#B91C1C",
  },
  form: {
    width: "100%",
  },
  actions: {
    marginTop: 12,
    width: "100%",
    alignItems: "center",
  },
  footerLink: {
    marginTop: 20,
    paddingVertical: 8,
  },
  footerText: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: "#57534E",
  },
  footerTextBold: {
    fontFamily: theme.font.semiBold,
    color: theme.colors.primary,
  },
});
