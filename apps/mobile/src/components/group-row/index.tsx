import { Lucide } from "@react-native-vector-icons/lucide";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import type { GroupRole, GroupStatus } from "@/services/types/groups";

export function membersLabel(count: number): string {
  return count === 1 ? "1 membro" : `${count} membros`;
}

interface GroupBadgesProps {
  role: GroupRole;
  status: GroupStatus;
}

export function GroupBadges({ role, status }: GroupBadgesProps) {
  return (
    <>
      {role === "admin" && (
        <Text style={[styles.badge, styles.badgeAdmin]}>Admin</Text>
      )}
      {status === "ended" && <Text style={styles.badge}>Encerrado</Text>}
    </>
  );
}

export interface GroupRowProps {
  name: string;
  membersCount: number;
  role: GroupRole;
  status: GroupStatus;
  onPress: () => void;
}

export default function GroupRow({
  name,
  membersCount,
  role,
  status,
  onPress,
}: GroupRowProps) {
  const isEnded = status === "ended";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.texts}>
        <Text
          style={[styles.name, isEnded && styles.nameEnded]}
          numberOfLines={1}
        >
          {name}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.members}>{membersLabel(membersCount)}</Text>
          <GroupBadges role={role} status={status} />
        </View>
      </View>
      <Lucide name="chevron-right" size={20} color={palette.inkSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray300,
  },
  rowPressed: {
    opacity: 0.6,
  },
  texts: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontFamily: theme.font.semiBold,
    fontSize: 20,
    color: palette.ink,
  },
  nameEnded: {
    color: palette.inkSoft,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  members: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: palette.inkSoft,
  },
  badge: {
    fontFamily: theme.font.medium,
    fontSize: 12,
    color: palette.inkSoft,
    backgroundColor: theme.colors.gray200,
    borderRadius: 9999,
    paddingVertical: 2,
    paddingHorizontal: 8,
    overflow: "hidden",
  },
  badgeAdmin: {
    color: palette.ink,
    backgroundColor: palette.sage,
  },
});
