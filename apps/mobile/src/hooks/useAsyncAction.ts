import { useTransition } from "react";
import { Alert } from "react-native";
import { getErrorMessage } from "@/services/api-errors";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}

/** Pergunta antes de uma ação que não dá para desfazer. */
export function confirmAction({
  title,
  message,
  confirmLabel,
  destructive = false,
  onConfirm,
}: ConfirmOptions) {
  Alert.alert(title, message, [
    { text: "Cancelar", style: "cancel" },
    {
      text: confirmLabel,
      style: destructive ? "destructive" : "default",
      onPress: onConfirm,
    },
  ]);
}

/**
 * Roda ações assíncronas de botão (encerrar, excluir, promover...) com um
 * `busy` para travar os botões. Se a ação falhar, mostra o erro num alerta
 * com o título `errorTitle`.
 */
export function useAsyncAction() {
  const [busy, startTransition] = useTransition();

  const run = (errorTitle: string, action: () => Promise<void>) =>
    startTransition(async () => {
      try {
        await action();
      } catch (err: unknown) {
        Alert.alert(errorTitle, getErrorMessage(err));
      }
    });

  return { busy, run };
}
