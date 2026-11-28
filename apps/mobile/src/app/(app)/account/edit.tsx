import { router } from "expo-router";
import useSWR from "swr";
import { AccountForm } from "@/components/forms/account-form";
import { BackButton, QueryState, Screen, ScreenHeader } from "@/components/ui";
import { useSession } from "@/hooks/useSession";
import { authKeys, getAccount, updateAccount } from "@/services/auth-api";
import type { UserPublic, UserUpdate } from "@/services/types/auth";

// Edição da conta: carrega o estado atual da API e envia só o que mudou.
export default function EditAccountScreen() {
  const { updateUser } = useSession();
  const {
    data: account,
    error,
    mutate,
  } = useSWR<UserPublic>(authKeys.me, getAccount);

  const handleSubmit = async (changes: UserUpdate) => {
    const updated = await updateAccount(changes);
    // A sessão em memória passa a refletir o PATCH sem novo login.
    updateUser(updated);
    await mutate(updated, { revalidate: false });
    router.back();
  };

  return (
    <Screen keyboardAvoiding>
      <BackButton />
      <ScreenHeader title="Editar conta" />
      <QueryState data={account} error={error} onRetry={() => mutate()}>
        {(current) => (
          <AccountForm
            initialValues={current}
            submitLabel="Salvar"
            submittingLabel="Salvando..."
            onSubmit={handleSubmit}
          />
        )}
      </QueryState>
    </Screen>
  );
}
