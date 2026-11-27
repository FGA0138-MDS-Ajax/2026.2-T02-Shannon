import { router } from "expo-router";
import { useState } from "react";
import AuthLayout from "@/components/auth-layout";
import Input from "@/components/input";
import { useSession } from "@/hooks/useSession";
import { getSingleErrorMessage } from "@/services/api-errors";

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
      router.replace("/(app)/(tabs)");
    } catch (err: unknown) {
      setErrorMessage(getSingleErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Comece sua jornada para construir hábitos melhores."
      error={errorMessage}
      submitLabel="Criar minha conta"
      submittingLabel="Cadastrando..."
      submitting={submitting}
      onSubmit={handleSubmit}
      footer={{
        text: "Já tem uma conta?",
        linkLabel: "Entrar",
        onPress: () => router.push("/(auth)/login"),
      }}
    >
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
    </AuthLayout>
  );
}
