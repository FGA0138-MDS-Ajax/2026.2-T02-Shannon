import { StyleSheet, Text, View } from "react-native";
import { Badge } from "@/components/group-row";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import type { MemberPublic } from "@/services/types/groups";
import { formatDate } from "@/utils/date";

export interface GroupMembersProps {
  members: MemberPublic[];
  currentUserId?: string;
}

// Integrantes na ordem da API: quem entrou primeiro aparece antes
export default function GroupMembers({
  members,
  currentUserId,
}: GroupMembersProps) {
  return (
    <View>
      {members.map((member) => {
        const isMe = member.user_id === currentUserId;
        return (
          <View
            key={member.user_id}
            testID={`member-${member.user_id}`}
            style={styles.row}
          >
            <View style={styles.texts}>
              <Text style={styles.username}>
                {member.username}
                {isMe && <Text style={styles.me}> (você)</Text>}
              </Text>
              <Text style={styles.joined}>
                Entrou em {formatDate(new Date(member.joined_at))}
              </Text>
            </View>
            {member.role === "admin" && <Badge label="Admin" highlight />}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray300,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  username: {
    fontFamily: theme.font.semiBold,
    fontSize: 16,
    color: palette.ink,
  },
  me: {
    fontFamily: theme.font.regular,
    color: palette.inkSoft,
  },
  joined: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: palette.inkSoft,
  },
});
