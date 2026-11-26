import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { ActionRow } from "@/components/ui";
import { confirmAction, useAsyncAction } from "@/hooks/useAsyncAction";
import { deleteHabit, finishHabit } from "@/services/habits-api";
import type { Habit } from "@/services/types/habits";

export interface HabitActionsProps {
  habit: Habit;
  /** Recebe o hábito já encerrado, para atualizar a tela sem recarregar */
  onFinished: (habit: Habit) => void;
}

// Editar, encerrar e excluir: só o autor de um hábito pessoal vê
export default function HabitActions({ habit, onFinished }: HabitActionsProps) {
  const { busy, run } = useAsyncAction();
  const isFinished = habit.status === "finished";

  const handleFinish = () =>
    confirmAction({
      title: "Encerrar hábito",
      message: "O hábito vai para a lista de encerrados. Deseja continuar?",
      confirmLabel: "Encerrar",
      onConfirm: () =>
        run("Não foi possível encerrar", async () => {
          onFinished(await finishHabit(habit.id));
        }),
    });

  const handleDelete = () =>
    confirmAction({
      title: "Excluir hábito",
      message:
        "Essa ação não pode ser desfeita. Os check-ins registrados continuam salvos.",
      confirmLabel: "Excluir",
      destructive: true,
      onConfirm: () =>
        run("Não foi possível excluir", async () => {
          await deleteHabit(habit.id);
          router.back();
        }),
    });

  return (
    <View style={styles.actions}>
      <ActionRow
        icon="edit-2"
        title="Editar"
        description="Editar metas, descrição e configurações"
        disabled={busy}
        onPress={() => router.push(`/habits/${habit.id}/edit`)}
      />
      {!isFinished && (
        <ActionRow
          icon="archive"
          title="Finalizar"
          description="Encerrar o hábito e movê-lo para a lista de encerrados"
          disabled={busy}
          onPress={handleFinish}
        />
      )}
      <ActionRow
        icon="trash-2"
        title="Deletar"
        description="Excluir o hábito permanentemente"
        destructive
        disabled={busy}
        onPress={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginTop: 24,
    marginBottom: 8,
    gap: 8,
  },
});
