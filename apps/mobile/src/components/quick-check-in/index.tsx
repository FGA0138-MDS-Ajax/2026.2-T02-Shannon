import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSWRConfig } from "swr";
import GroupTag from "@/components/group-tag";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import { isHomeDataKey } from "@/hooks/useHabitsCheckIns";
import { getErrorMessage } from "@/services/api-errors";
import { createCheckIn } from "@/services/check-ins-api";
import { listHabitCheckIns } from "@/services/habits-api";
import type { GroupSummary } from "@/services/types/habits";
import {
  isGroupDataKey,
  nextCheckInTitle,
  TITLE_MAX,
} from "@/utils/quick-check-in";

export interface QuickCheckInHabit {
  id: string;
  name: string;
  group?: GroupSummary | null;
}

export interface QuickCheckInSheetProps {
  // `null` deixa a folha fechada
  habit: QuickCheckInHabit | null;
  // Quem está usando o app: só os check-ins dele contam no número do título
  userId?: string;
  onClose: () => void;
}

/**
 * Check-in rápido de um hábito: o toque no "+" abre esta folha com o título
 * pronto ("Pedalar #5") e o "Confirmar" grava. Para marcar vários hábitos ou
 * escrever descrição e duração, continua a aba Check-in.
 */
export default function QuickCheckInSheet({
  habit,
  userId,
  onClose,
}: QuickCheckInSheetProps) {
  const { mutate } = useSWRConfig();
  const [title, setTitle] = useState("");
  // Enquanto a pessoa não mexe, o título acompanha o número que chega da API
  const [edited, setEdited] = useState(false);
  const [counting, setCounting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const habitId = habit?.id;
  const habitName = habit?.name;

  // Cada vez que abre: começa com o nome e busca quantos check-ins já tem
  useEffect(() => {
    if (!habitId || !habitName) return;
    let active = true;
    const initial = habitName.slice(0, TITLE_MAX);
    setTitle(initial);
    setEdited(false);
    setError(null);
    setCounting(true);
    listHabitCheckIns(habitId)
      .then((checkIns) => {
        if (!active) return;
        const next = nextCheckInTitle(habitName, checkIns, userId);
        // Se a pessoa já mudou o título, não passa por cima
        setTitle((current) => (current === initial ? next : current));
      })
      // Sem o número, fica só o nome: dá para fazer o check-in do mesmo jeito
      .catch(() => {})
      .finally(() => active && setCounting(false));
    return () => {
      active = false;
    };
  }, [habitId, habitName, userId]);

  const close = () => {
    if (sending) return;
    onClose();
  };

  const confirm = async () => {
    if (!habit || sending) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Dê um título ao check-in.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await createCheckIn({ title: trimmed, habit_ids: [habit.id] });
      // Home, lista de hábitos e telas de grupo mostram o check-in na hora
      mutate((key) => isHomeDataKey(key) || isGroupDataKey(key));
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={habit !== null}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          accessibilityLabel="Cancelar check-in"
          onPress={close}
          style={styles.backdrop}
        />
        {/* A margem de baixo soma a barra de gestos do aparelho */}
        <SafeAreaView edges={["bottom"]} style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>CHECK-IN</Text>
          <Text style={styles.name} numberOfLines={2}>
            {habit?.name}
          </Text>
          {habit?.group && (
            <View style={styles.tag}>
              <GroupTag name={habit.group.name} />
            </View>
          )}

          <Text style={styles.label}>Título</Text>
          <View style={styles.field}>
            <TextInput
              testID="quick-check-in-title"
              value={title}
              onChangeText={(text) => {
                setEdited(true);
                setTitle(text);
              }}
              maxLength={TITLE_MAX}
              autoCapitalize="sentences"
              returnKeyType="done"
              onSubmitEditing={confirm}
              editable={!sending}
              style={styles.input}
            />
            {counting && !edited && (
              <ActivityIndicator size="small" color={palette.inkSoft} />
            )}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            accessibilityRole="button"
            onPress={confirm}
            disabled={sending}
            style={({ pressed }) => [
              styles.confirm,
              (pressed || sending) && styles.pressed,
            ]}
          >
            {sending ? (
              <ActivityIndicator color={palette.cream} />
            ) : (
              <Text style={styles.confirmText}>Confirmar</Text>
            )}
          </Pressable>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(37, 40, 31, 0.55)",
  },
  sheet: {
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 22,
    backgroundColor: palette.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.cardBorder,
    marginBottom: 16,
  },
  eyebrow: {
    fontFamily: theme.font.medium,
    fontSize: 10,
    color: palette.inkSoft,
  },
  name: {
    marginTop: 6,
    fontFamily: theme.font.medium,
    fontSize: 24,
    color: palette.ink,
  },
  tag: {
    marginTop: 8,
  },
  label: {
    marginTop: 20,
    fontFamily: theme.font.regular,
    fontSize: 11,
    color: palette.inkSoft,
  },
  field: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    borderRadius: 16,
    backgroundColor: palette.cream,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontFamily: theme.font.medium,
    fontSize: 15,
    color: palette.ink,
  },
  error: {
    marginTop: 10,
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: palette.riskText,
  },
  confirm: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: palette.ink,
  },
  pressed: {
    opacity: 0.7,
  },
  confirmText: {
    fontFamily: theme.font.medium,
    fontSize: 15,
    color: palette.cream,
  },
});
