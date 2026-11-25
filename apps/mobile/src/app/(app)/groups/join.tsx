import { type Href, router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "@/components/button";
import FormHeader from "@/components/form-header";
import Input from "@/components/input";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import { ApiError } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import { joinGroup, previewInvite } from "@/services/groups-api";
import type { GroupPreview } from "@/services/types/groups";
import { membersLabel } from "@/utils/groups";

const ALREADY_MEMBER = "Você já participa deste grupo.";

// Dois passos: primeiro a prévia pelo código, depois a confirmação.
// O código vai como foi digitado: a API ignora espaços, hífens e minúsculas.
export default function JoinGroupScreen() {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<GroupPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openGroup = (groupId: string) =>
    router.replace(`/groups/${groupId}` as Href);

  const handleChangeCode = (text: string) => {
    setCode(text);
    setPreview(null);
    setError(null);
  };

  const handlePreview = async () => {
    if (!code.trim()) {
      setError("Digite o código do convite.");
      return;
    }

    setLoading(true);
    try {
      setPreview(await previewInvite(code));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!preview) return;

    setLoading(true);
    try {
      const group = await joinGroup(code);
      openGroup(group.id);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      // Quem já é membro não precisa entrar de novo: abre o grupo
      if (
        err instanceof ApiError &&
        err.status === 409 &&
        message === ALREADY_MEMBER
      ) {
        openGroup(preview.id);
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const isEnded = preview?.status === "ended";

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FormHeader title="Entrar com código" />

        <Input
          testID="invite-code-input"
          label="Código do convite"
          placeholder="ex: K7Q2-MX9P"
          value={code}
          onChangeText={handleChangeCode}
          autoCapitalize="characters"
          autoCorrect={false}
          onSubmitEditing={handlePreview}
          error={preview ? undefined : (error ?? undefined)}
        />

        {preview ? (
          <View style={styles.preview}>
            <Text style={styles.previewQuestion}>Entrar em</Text>
            <Text style={styles.previewName}>{preview.name}</Text>
            <Text style={styles.previewMembers}>
              {membersLabel(preview.members_count)}
            </Text>
            {isEnded && (
              <Text style={styles.warning}>
                Este grupo já foi encerrado e não aceita novos membros.
              </Text>
            )}
            {error && <Text style={styles.warning}>{error}</Text>}

            <Button
              width="full"
              onPress={handleJoin}
              disabled={loading || isEnded}
              style={styles.previewButton}
            >
              {loading ? "Entrando..." : "Entrar no grupo"}
            </Button>
          </View>
        ) : (
          <Button width="full" onPress={handlePreview} disabled={loading}>
            {loading ? "Procurando..." : "Ver grupo"}
          </Button>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: theme.colors.gray,
  },
  keyboardView: {
    flex: 1,
  },
  preview: {
    backgroundColor: theme.colors.gray100,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    gap: 4,
  },
  previewQuestion: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: palette.inkSoft,
  },
  previewName: {
    fontFamily: theme.font.bold,
    fontSize: 28,
    color: palette.ink,
    textAlign: "center",
  },
  previewMembers: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: palette.inkSoft,
  },
  warning: {
    marginTop: 8,
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: palette.riskText,
    textAlign: "center",
  },
  previewButton: {
    marginTop: 16,
  },
});
