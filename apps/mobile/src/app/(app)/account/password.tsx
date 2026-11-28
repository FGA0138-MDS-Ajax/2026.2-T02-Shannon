import { router } from "expo-router";
import { PasswordForm } from "@/components/forms/password-form";
import { BackButton, Screen, ScreenHeader } from "@/components/ui";
import { useSession } from "@/hooks/useSession";
import { changePassword } from "@/services/auth-api";
import type { PasswordChange } from "@/services/types/auth";

// Troca de senha: a API encerra as outras sessões e devolve um par novo de
// tokens, que substitui os dois guardados antes de qualquer outra chamada.
export default function ChangePasswordScreen() {
  const { replaceTokens } = useSession();

  const handleSubmit = async (body: PasswordChange) => {
    const tokens = await changePassword(body);
    await replaceTokens(tokens);
    router.back();
  };

  return (
    <Screen keyboardAvoiding>
      <BackButton />
      <ScreenHeader title="Alterar senha" />
      <PasswordForm
        submitLabel="Salvar"
        submittingLabel="Salvando..."
        onSubmit={handleSubmit}
      />
    </Screen>
  );
}
