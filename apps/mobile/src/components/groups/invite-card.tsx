import { Share, StyleSheet, Text, View } from "react-native";
import Button from "@/components/button";
import { Card } from "@/components/ui";
import { formatInviteCode } from "@/config/group-labels";
import { theme } from "@/config/theme";
import { confirmAction, useAsyncAction } from "@/hooks/useAsyncAction";
import { regenerateInviteCode } from "@/services/groups-api";

export interface InviteCardProps {
  groupId: string;
  groupName: string;
  code: string;
  onRegenerated: () => void;
}

// Código de convite do grupo (só admin vê): compartilhar ou gerar outro
export default function InviteCard({
  groupId,
  groupName,
  code,
  onRegenerated,
}: InviteCardProps) {
  const { busy, run } = useAsyncAction();
  const formatted = formatInviteCode(code);

  const handleShare = () =>
    Share.share({
      message: `Entre no grupo "${groupName}" no Habbit com o código ${formatted}`,
    });

  const handleRegenerate = () =>
    confirmAction({
      title: "Gerar novo código",
      message: "O código atual deixa de funcionar na hora. Deseja continuar?",
      confirmLabel: "Gerar",
      onConfirm: () =>
        run("Não foi possível gerar o código", async () => {
          await regenerateInviteCode(groupId);
          onRegenerated();
        }),
    });

  return (
    <Card testID="invite-card" style={styles.invite}>
      <Text style={styles.inviteLabel}>Código de convite</Text>
      <Text testID="invite-code" style={styles.inviteCode} selectable>
        {formatted}
      </Text>
      <View style={styles.inviteActions}>
        <Button
          variant="outline"
          style={styles.inviteButton}
          disabled={busy}
          onPress={handleRegenerate}
        >
          Gerar novo
        </Button>
        <Button
          testID="share-invite-button"
          style={styles.inviteButton}
          onPress={handleShare}
        >
          Compartilhar
        </Button>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  invite: {
    gap: 4,
  },
  inviteLabel: {
    fontFamily: theme.font.medium,
    fontSize: 13,
    color: theme.colors.muted,
  },
  inviteCode: {
    fontFamily: theme.font.bold,
    fontSize: 24,
    letterSpacing: 2,
    color: theme.colors.text,
  },
  inviteActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  inviteButton: {
    flex: 1,
    paddingHorizontal: 12,
  },
});
