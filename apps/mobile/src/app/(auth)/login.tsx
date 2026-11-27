import { router } from "expo-router";
import { useState } from "react";
import AuthLayout from "@/components/auth-layout";
import Input from "@/components/input";
import { useSession } from "@/hooks/useSession";
import { getSingleErrorMessage } from "@/services/api-errors";

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
      router.replace("/(app)/(tabs)");
    } catch (err: unknown) {
      setErrorMessage(getSingleErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Acessar conta"
      subtitle="Bem-vindo de volta! Entre com seus dados para continuar."
      error={errorMessage}
      submitLabel="Entrar"
      submittingLabel="Entrando..."
      submitting={submitting}
      onSubmit={handleSubmit}
      footer={{
        text: "Não tem uma conta?",
        linkLabel: "Cadastre-se",
        onPress: () => router.push("/(auth)/signup"),
      }}
    >
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
    </AuthLayout>
  );
}
