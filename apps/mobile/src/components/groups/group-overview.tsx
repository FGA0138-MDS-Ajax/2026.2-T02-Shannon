import { Share, StyleSheet, Text, View } from "react-native";
import Button from "@/components/button";
import { Badge, Card } from "@/components/ui";
import {
  describeGroupPeriod,
  formatInviteCode,
  groupStatusLabels,
  groupStatusTones,
  rankingCriterionLabels,
} from "@/config/group-labels";
import { theme } from "@/config/theme";
import { confirmAction, useAsyncAction } from "@/hooks/useAsyncAction";
import { regenerateInviteCode } from "@/services/groups-api";
import { GROUP_MAX_MEMBERS, type GroupDetail } from "@/services/types/groups";

export interface GroupOverviewProps {
  group: GroupDetail;
  /** Recarrega o grupo depois de uma mudança (ex.: código novo) */
  onChanged: () => void;
}

// Topo da tela do grupo: nome, situação, resumo e o convite (só admin vê)
export default function GroupOverview({
  group,
  onChanged,
}: GroupOverviewProps) {
  const period = describeGroupPeriod(group.status, group.ends_on);
  const details = [
    `${group.members_count}/${GROUP_MAX_MEMBERS} integrantes`,
    `Ranking por ${rankingCriterionLabels[group.ranking_criterion].toLowerCase()}`,
    period,
  ].filter(Boolean);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{group.name}</Text>
        <Badge
          testID="group-status"
          label={groupStatusLabels[group.status]}
          tone={groupStatusTones[group.status]}
        />
      </View>
      <Text style={styles.details}>{details.join(" · ")}</Text>
      {group.description && (
        <Text style={styles.description}>{group.description}</Text>
      )}

      {group.invite_code && group.status === "active" && (
        <InviteCard
          groupId={group.id}
          groupName={group.name}
          code={group.invite_code}
          onRegenerated={onChanged}
        />
      )}
    </View>
  );
}

interface InviteCardProps {
  groupId: string;
  groupName: string;
  code: string;
  onRegenerated: () => void;
}

function InviteCard({
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
  container: {
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flex: 1,
    fontFamily: theme.font.bold,
    fontSize: 26,
    color: theme.colors.text,
  },
  details: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.muted,
    lineHeight: 20,
  },
  description: {
    marginTop: 8,
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: theme.colors.label,
    lineHeight: 22,
  },
  invite: {
    marginTop: 16,
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
