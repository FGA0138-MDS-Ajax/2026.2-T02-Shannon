import { useState } from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";
import Button from "@/components/button";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import { getErrorMessage } from "@/services/api-errors";
import { regenerateInvite } from "@/services/groups-api";

export interface GroupInviteProps {
  groupId: string;
  groupName: string;
  code: string;
  onRegenerated: () => void;
}

// Só admin vê. Não existe link de convite: compartilha-se o texto do código.
export default function GroupInvite({
  groupId,
  groupName,
  code,
  onRegenerated,
}: GroupInviteProps) {
  const [regenerating, setRegenerating] = useState(false);

  const handleShare = () => {
    Share.share({
      message: `Entra no grupo "${groupName}" no Habbit com o código ${code}`,
    });
  };

  const regenerate = async () => {
    setRegenerating(true);
    try {
      await regenerateInvite(groupId);
      onRegenerated();
    } catch (err: unknown) {
      Alert.alert("Não foi possível gerar o código", getErrorMessage(err));
    } finally {
      setRegenerating(false);
    }
  };

  const handleRegenerate = () => {
    Alert.alert(
      "Gerar um novo código?",
      "O código atual deixa de funcionar na hora.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Gerar novo", onPress: regenerate },
      ],
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Código de convite</Text>
      <Text
        style={styles.code}
        selectable
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {code}
      </Text>
      <Button width="full" onPress={handleShare}>
        Compartilhar código
      </Button>
      <Button
        variant="secondary"
        width="full"
        onPress={handleRegenerate}
        disabled={regenerating}
      >
        {regenerating ? "Gerando..." : "Gerar novo código"}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
    alignItems: "center",
    gap: 8,
    padding: 24,
    backgroundColor: theme.colors.gray100,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    borderRadius: 22,
  },
  label: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: palette.inkSoft,
  },
  code: {
    marginBottom: 8,
    fontFamily: theme.font.bold,
    fontSize: 32,
    letterSpacing: 2,
    color: palette.ink,
  },
});
