import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Button from "@/components/button";
import { Avatar, Badge, Card } from "@/components/ui";
import { groupRoleLabels } from "@/config/group-labels";
import { theme } from "@/config/theme";
import { confirmAction, useAsyncAction } from "@/hooks/useAsyncAction";
import { useSession } from "@/hooks/useSession";
import { leaveGroup, promoteMember, removeMember } from "@/services/groups-api";
import {
  GROUP_MAX_MEMBERS,
  type GroupDetail,
  type GroupMember,
  type LeaveResult,
} from "@/services/types/groups";
import { formatDate } from "@/utils/date";
import AddMemberForm from "./add-member-form";

/** Mensagem exibida ao sair, conforme o resultado da API. */
export function leaveMessage(
  result: LeaveResult,
  members: GroupMember[],
): string {
  if (result.group_deleted) return "Grupo apagado";
  if (result.promoted_user_id) {
    const promoted = members.find((m) => m.user_id === result.promoted_user_id);
    return `${promoted?.username ?? result.promoted_user_id} agora é admin`;
  }
  return "Você saiu do grupo";
}

export interface GroupMembersProps {
  group: GroupDetail;
  colorOf: (userId: string) => string;
  onChanged: () => void;
}

export default function GroupMembers({
  group,
  colorOf,
  onChanged,
}: GroupMembersProps) {
  const { user } = useSession();
  const { busy, run } = useAsyncAction();
  const isAdmin = group.my_role === "admin";
  const adminCount = group.members.filter((m) => m.role === "admin").length;

  const openMemberActions = (member: GroupMember) => {
    const promote = {
      text: "Promover a admin",
      onPress: () =>
        run("Não foi possível promover", async () => {
          await promoteMember(group.id, member.user_id);
          onChanged();
        }),
    };
    const remove = {
      text: "Remover do grupo",
      style: "destructive" as const,
      onPress: () =>
        // Remover não dá para desfazer: confirma antes de executar
        confirmAction({
          title: "Remover integrante",
          message: `Remover ${member.username} do grupo?`,
          confirmLabel: "Remover",
          destructive: true,
          onConfirm: () =>
            run("Não foi possível remover", async () => {
              await removeMember(group.id, member.user_id);
              onChanged();
            }),
        }),
    };
    Alert.alert(member.username, undefined, [
      ...(member.role === "member" ? [promote] : []),
      remove,
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const handleLeave = () => {
    const isLastAdmin = isAdmin && adminCount === 1 && group.members_count > 1;
    const isLastMember = group.members_count === 1;
    confirmAction({
      title: isLastMember ? "Sair e apagar o grupo" : "Sair do grupo",
      message: isLastMember
        ? "Você é o último integrante: o grupo será apagado."
        : isLastAdmin
          ? "Você é o único admin: o integrante mais antigo vai assumir."
          : "Você deixa de ver os hábitos e o feed deste grupo.",
      confirmLabel: "Sair",
      destructive: true,
      onConfirm: () =>
        run("Não foi possível sair", async () => {
          const result = await leaveGroup(group.id);
          // Volta para a lista recarregada; a mensagem explica o resultado
          Alert.alert(leaveMessage(result, group.members));
          router.back();
        }),
    });
  };

  return (
    <View style={styles.container}>
      {isAdmin && group.status === "active" && (
        <AddMemberForm
          groupId={group.id}
          isFull={group.members_count >= GROUP_MAX_MEMBERS}
          onAdded={onChanged}
        />
      )}

      <Card style={styles.list}>
        {group.members.map((member, index) => {
          const isMe = member.user_id === user?.id;
          const canManage = isAdmin && !isMe;
          return (
            <Pressable
              key={member.user_id}
              testID={`member-${member.username}`}
              disabled={!canManage || busy}
              onPress={() => openMemberActions(member)}
              accessibilityRole={canManage ? "button" : undefined}
              style={[
                styles.member,
                index === group.members.length - 1 && styles.memberLast,
              ]}
            >
              <Avatar name={member.username} color={colorOf(member.user_id)} />
              <View style={styles.memberInfo}>
                <Text style={styles.username} numberOfLines={1}>
                  {isMe ? "Você" : member.username}
                </Text>
                <Text style={styles.joined}>
                  Desde {formatDate(new Date(member.joined_at))}
                </Text>
              </View>
              <Badge
                label={groupRoleLabels[member.role]}
                tone={member.role === "admin" ? "primary" : "neutral"}
              />
            </Pressable>
          );
        })}
      </Card>
      {isAdmin && (
        <Text style={styles.hint}>
          Toque em um integrante para promover ou remover.
        </Text>
      )}

      <Button
        testID="leave-group-button"
        variant="danger"
        width="full"
        disabled={busy}
        onPress={handleLeave}
      >
        {group.members_count === 1 ? "Sair e apagar o grupo" : "Sair do grupo"}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  list: {
    paddingVertical: 4,
  },
  member: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  memberLast: {
    borderBottomWidth: 0,
  },
  memberInfo: {
    flex: 1,
  },
  username: {
    fontFamily: theme.font.semiBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  joined: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  hint: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.colors.muted,
    textAlign: "center",
  },
});
