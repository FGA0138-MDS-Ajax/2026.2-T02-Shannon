import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Button from "@/components/button";
import Input from "@/components/input";
import { theme } from "@/config/theme";
import { getErrorMessage } from "@/services/api-errors";
import { addMember } from "@/services/groups-api";
import { GROUP_MAX_MEMBERS } from "@/services/types/groups";

interface AddMemberFormProps {
  groupId: string;
  isFull: boolean;
  onAdded: () => void;
}

export default function AddMemberForm({
  groupId,
  isFull,
  onAdded,
}: AddMemberFormProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    const trimmed = username.trim().replace(/^@/, "");
    if (!trimmed) {
      setError("Informe o nome de usuário.");
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      await addMember(groupId, trimmed);
      setUsername("");
      onAdded();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (isFull) {
    return (
      <Text style={styles.hint}>
        O grupo chegou ao limite de {GROUP_MAX_MEMBERS} integrantes.
      </Text>
    );
  }

  return (
    <View style={styles.addRow}>
      <View style={styles.addInput}>
        <Input
          testID="add-member-input"
          label="Adicionar por nome de usuário"
          placeholder="ex: ana_souza"
          value={username}
          onChangeText={setUsername}
          autoCorrect={false}
          error={error}
          onSubmitEditing={handleAdd}
        />
      </View>
      <Button
        testID="add-member-button"
        style={styles.addButton}
        disabled={submitting}
        onPress={handleAdd}
      >
        {submitting ? "..." : "Adicionar"}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  addRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  addInput: {
    flex: 1,
  },
  addButton: {
    // Alinha com a caixa do input, abaixo do rótulo
    marginTop: 26,
    height: 48,
    paddingHorizontal: 16,
  },
  hint: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.colors.muted,
    textAlign: "center",
  },
});
