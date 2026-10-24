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

export default function SignupScreen() {
  const { signUp } = useSession();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();

    try {
      setSubmitting(true);
      await signUp({
        name: trimmedName,
        username: trimmedUsername,
        email: trimmedEmail,
        password,
      });
      router.replace("/(app)");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Erro ao realizar cadastro.",
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
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>
            Comece sua jornada para construir hábitos melhores.
          </Text>
        </View>
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}

        <ScrollView style={styles.form} keyboardShouldPersistTaps="always">
          <Input
            label="Nome completo"
            placeholder="Seu Nome"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Input
            label="Nome de usuário"
            placeholder="ex: pedro_silva"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            returnKeyType="next"
          />

          <Input
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
          />

          <Input
            label="Senha"
            placeholder="Mínimo de 8 caracteres"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
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
            {submitting ? "Cadastrando..." : "Criar minha conta"}
          </Button>

          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={styles.footerLink}
          >
            <Text style={styles.footerText}>
              Já tem uma conta?{" "}
              <Text style={styles.footerTextBold}>Entrar</Text>
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
    display: "flex",
    justifyContent: "space-between",
  },
  header: {
    marginBottom: 28,
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
    flex: 1,
    flexGrow: 1,
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
