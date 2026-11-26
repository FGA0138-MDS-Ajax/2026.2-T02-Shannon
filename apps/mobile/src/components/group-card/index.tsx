import { Lucide } from "@react-native-vector-icons/lucide";
import { StyleSheet, Text, View } from "react-native";
import { Badge, Card } from "@/components/ui";
import {
  describeGroupPeriod,
  groupRoleLabels,
  groupStatusLabels,
  groupStatusTones,
  rankingCriterionLabels,
} from "@/config/group-labels";
import { theme } from "@/config/theme";
import { GROUP_MAX_MEMBERS, type GroupListItem } from "@/services/types/groups";

export interface GroupCardProps {
  group: GroupListItem;
  onPress?: () => void;
}

export default function GroupCard({ group, onPress }: GroupCardProps) {
  const period = describeGroupPeriod(group.status, group.ends_on);

  return (
    <Card
      testID={`group-card-${group.id}`}
      onPress={onPress}
      accessibilityLabel={`Grupo ${group.name}`}
      style={styles.card}
    >
      <View style={styles.titleRow}>
        <View style={styles.icon}>
          <Lucide name="users" size={18} color={theme.colors.primaryDark} />
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {group.name}
        </Text>
        <Badge
          label={groupStatusLabels[group.status]}
          tone={groupStatusTones[group.status]}
        />
      </View>

      <Text style={styles.details}>
        {group.members_count}/{GROUP_MAX_MEMBERS} integrantes · Ranking por{" "}
        {rankingCriterionLabels[group.ranking_criterion].toLowerCase()}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.meta}>{period ?? "Sem data de término"}</Text>
        {group.my_role === "admin" && (
          <Text style={styles.role}>{groupRoleLabels.admin}</Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    flex: 1,
    fontFamily: theme.font.semiBold,
    fontSize: 16,
    color: theme.colors.text,
  },
  details: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  meta: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  role: {
    fontFamily: theme.font.medium,
    fontSize: 13,
    color: theme.colors.primaryDark,
  },
});
