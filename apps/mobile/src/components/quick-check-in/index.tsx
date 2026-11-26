import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import useSWR, { useSWRConfig } from "swr";
import Button from "@/components/button";
import Input from "@/components/input";
import { Badge, Sheet } from "@/components/ui";
import { theme } from "@/config/theme";
import { useLastDefined } from "@/hooks/useLastDefined";
import { request } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import { createCheckIn, isAffectedByCheckIn } from "@/services/check-ins-api";
import { habitKeys } from "@/services/habits-api";
import type { CheckIn, GroupSummary } from "@/services/types/habits";
import { CHECK_IN_TITLE_MAX, nextCheckInTitle } from "@/utils/check-in-title";

export interface QuickCheckInHabit {
  id: string;
  name: string;
  group?: GroupSummary | null;
}

export interface QuickCheckInSheetProps {
  /** `null` deixa a folha fechada */
  habit: QuickCheckInHabit | null;
  /** Só os check-ins de quem está usando o app contam no número do título */
  userId?: string;
  onClose: () => void;
}

/**
 * Check-in de um hábito em dois toques: o "+" abre a folha com o título
 * pronto ("Pedalar #5") e o "Confirmar" grava. Para marcar vários hábitos ou
 * escrever descrição e duração, continua o fluxo completo da aba Check-in.
 */
export default function QuickCheckInSheet({
  habit,
  userId,
  onClose,
}: QuickCheckInSheetProps) {
  // Mantém o hábito na tela enquanto a folha desce
  const shown = useLastDefined(habit);
  const [sending, setSending] = useState(false);

  return (
    <Sheet
      testID="quick-check-in"
      visible={habit !== null}
      eyebrow="CHECK-IN RÁPIDO"
      onClose={() => {
        if (!sending) onClose();
      }}
    >
      {/* O conteúdo do Modal desmonta ao fechar: cada abertura começa do zero */}
      {shown && (
        <QuickCheckInForm
          habit={shown}
          userId={userId}
          sending={sending}
          onSendingChange={setSending}
          onDone={onClose}
        />
      )}
    </Sheet>
  );
}

interface QuickCheckInFormProps {
  habit: QuickCheckInHabit;
  userId?: string;
  sending: boolean;
  onSendingChange: (sending: boolean) => void;
  onDone: () => void;
}

function QuickCheckInForm({
  habit,
  userId,
  sending,
  onSendingChange,
  onDone,
}: QuickCheckInFormProps) {
  const { mutate } = useSWRConfig();
  const { data: checkIns } = useSWR<CheckIn[]>(
    habitKeys.checkIns(habit.id),
    request,
  );
  // Enquanto a pessoa não mexe, o título acompanha a contagem que chega da API.
  // Sem a contagem, fica só o nome: o check-in sai do mesmo jeito.
  const [edited, setEdited] = useState<string | null>(null);
  const suggested = checkIns
    ? nextCheckInTitle(habit.name, checkIns, userId)
    : habit.name.slice(0, CHECK_IN_TITLE_MAX);
  const title = edited ?? suggested;
  const [error, setError] = useState<string>();

  const confirm = async () => {
    if (sending) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Informe o título do check-in.");
      return;
    }
    onSendingChange(true);
    setError(undefined);
    try {
      await createCheckIn({ title: trimmed, habit_ids: [habit.id] });
      mutate(isAffectedByCheckIn);
      onDone();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      onSendingChange(false);
    }
  };

  return (
    <>
      <Text style={styles.name} numberOfLines={2}>
        {habit.name}
      </Text>
      {habit.group && (
        <View style={styles.group}>
          <Badge label={habit.group.name} tone="primary" />
        </View>
      )}

      <View style={styles.field}>
        <Input
          testID="quick-check-in-title"
          label="Título"
          value={title}
          onChangeText={setEdited}
          maxLength={CHECK_IN_TITLE_MAX}
          autoCapitalize="sentences"
          returnKeyType="done"
          onSubmitEditing={confirm}
          editable={!sending}
          error={error}
        />
      </View>

      <Button
        testID="quick-check-in-confirm"
        width="full"
        disabled={sending}
        onPress={confirm}
      >
        {sending ? "Registrando..." : "Confirmar"}
      </Button>
    </>
  );
}

const styles = StyleSheet.create({
  name: {
    marginTop: 4,
    fontFamily: theme.font.bold,
    fontSize: 22,
    color: theme.colors.text,
  },
  group: {
    marginTop: 8,
    flexDirection: "row",
  },
  field: {
    marginTop: 20,
  },
});
