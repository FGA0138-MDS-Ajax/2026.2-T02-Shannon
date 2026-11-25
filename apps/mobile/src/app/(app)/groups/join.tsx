import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import useSWR from "swr";
import Button from "@/components/button";
import Input from "@/components/input";
import {
  Badge,
  Card,
  ErrorBanner,
  HeaderAction,
  Screen,
  ScreenHeader,
} from "@/components/ui";
import { groupStatusLabels, groupStatusTones } from "@/config/group-labels";
import { theme } from "@/config/theme";
import { request } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import {
  groupKeys,
  joinGroup,
  normalizeInviteCode,
  previewGroup,
} from "@/services/groups-api";
import {
  GROUP_MAX_MEMBERS,
  type GroupListItem,
  type GroupPreview,
} from "@/services/types/groups";

// Dois passos: confere o código (pré-visualização) e depois entra
export default function JoinGroupScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(params.code ?? "");
  const [preview, setPreview] = useState<GroupPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // A pré-visualização não diz se a pessoa já participa: confere na lista
  const { data: myGroups } = useSWR<GroupListItem[]>(groupKeys.list, request);
  const isMember = !!preview && !!myGroups?.some((g) => g.id === preview.id);

  const isCodeFilled = normalizeInviteCode(code).length > 0;

  const run = async (action: () => Promise<void>) => {
    setError(null);
    setLoading(true);
    try {
      await action();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () =>
    run(async () => {
      setPreview(await previewGroup(code));
    });

  const handleJoin = () =>
    run(async () => {
      const group = await joinGroup(code);
      router.replace(`/groups/${group.id}`);
    });

  const handleCodeChange = (text: string) => {
    setCode(text);
    // Código novo: a pré-visualização anterior não vale mais
    setPreview(null);
    setError(null);
  };

  return (
    <Screen keyboardAvoiding>
      <ScreenHeader
        title="Entrar em grupo"
        subtitle="Peça o código de convite a um administrador do grupo."
        action={<HeaderAction label="Cancelar" onPress={() => router.back()} />}
      />

      {error && <ErrorBanner testID="join-error" message={error} />}

      <Input
        testID="invite-code-input"
        label="Código de convite"
        placeholder="ex: K7P4-M9X2"
        value={code}
        onChangeText={handleCodeChange}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={12}
        onSubmitEditing={handlePreview}
      />

      {preview && (
        <Card testID="group-preview" style={styles.preview}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewName}>{preview.name}</Text>
            <Badge
              label={groupStatusLabels[preview.status]}
              tone={groupStatusTones[preview.status]}
            />
          </View>
          <Text style={styles.previewDetails}>
            {preview.members_count}/{GROUP_MAX_MEMBERS} integrantes
          </Text>
        </Card>
      )}

      <View style={styles.actions}>
        {preview && isMember ? (
          <Button
            testID="open-group-button"
            width="full"
            onPress={() => router.replace(`/groups/${preview.id}`)}
          >
            Você já participa · Abrir grupo
          </Button>
        ) : preview ? (
          <Button
            testID="join-button"
            width="full"
            disabled={loading || preview.status === "ended"}
            onPress={handleJoin}
          >
            {loading ? "Entrando..." : "Entrar no grupo"}
          </Button>
        ) : (
          <Button
            testID="preview-button"
            width="full"
            disabled={loading || !isCodeFilled}
            onPress={handlePreview}
          >
            {loading ? "Buscando..." : "Buscar grupo"}
          </Button>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    gap: 6,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  previewName: {
    flex: 1,
    fontFamily: theme.font.semiBold,
    fontSize: 17,
    color: theme.colors.text,
  },
  previewDetails: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
  actions: {
    marginTop: "auto",
    marginBottom: 16,
  },
});
