import {
  type Href,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AddMember from "@/components/add-member";
import BackButton from "@/components/back-button";
import Button from "@/components/button";
import GroupInvite from "@/components/group-invite";
import GroupMembers from "@/components/group-members";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import { useGroup } from "@/hooks/useGroup";
import { useSession } from "@/hooks/useSession";
import { getErrorMessage } from "@/services/api-errors";
import { leaveGroup, promoteMember, removeMember } from "@/services/groups-api";
import type { GroupDetail, MemberPublic } from "@/services/types/groups";
import { formatDate, parseApiDate } from "@/utils/date";
import {
  criterionLabels,
  endsOnLabel,
  leavePlan,
  leaveResultMessage,
} from "@/utils/groups";

export default function GroupAboutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const {
    data: group,
    error,
    isLoading,
    notFound,
    mutate: refreshGroup,
  } = useGroup(id);

  useFocusEffect(
    useCallback(() => {
      refreshGroup();
    }, [refreshGroup]),
  );

  // Ações do admin terminam recarregando o detalhe (membros e contagem)
  const runAction = async (
    failTitle: string,
    action: () => Promise<unknown>,
  ) => {
    try {
      await action();
    } catch (err: unknown) {
      Alert.alert(failTitle, getErrorMessage(err));
    }
    refreshGroup();
  };

  const confirmRemove = (member: MemberPublic) => {
    Alert.alert(
      `Remover ${member.username}?`,
      "A pessoa sai do grupo e deixa de aparecer no ranking.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () =>
            runAction("Não foi possível remover", () =>
              removeMember(id, member.user_id),
            ),
        },
      ],
    );
  };

  const handleLeave = (current: GroupDetail) => {
    const plan = leavePlan(current, user?.id);
    Alert.alert(`${plan.buttonLabel}?`, plan.warning, [
      { text: "Cancelar", style: "cancel" },
      {
        text: plan.buttonLabel,
        style: "destructive",
        onPress: async () => {
          try {
            const result = await leaveGroup(id);
            Alert.alert(leaveResultMessage(result, current.members));
            router.dismissTo("/(app)/(tabs)/groups" as Href);
          } catch (err: unknown) {
            Alert.alert("Não foi possível sair", getErrorMessage(err));
          }
        },
      },
    ]);
  };

  const handleMemberPress = (member: MemberPublic) => {
    Alert.alert(member.username, undefined, [
      ...(member.role === "member"
        ? [
            {
              text: "Tornar admin",
              onPress: () =>
                runAction("Não foi possível promover", () =>
                  promoteMember(id, member.user_id),
                ),
            },
          ]
        : []),
      {
        text: "Remover do grupo",
        style: "destructive" as const,
        onPress: () => confirmRemove(member),
      },
      { text: "Cancelar", style: "cancel" as const },
    ]);
  };

  const renderContent = () => {
    if (isLoading && !group) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    if (!group) {
      return (
        <View style={styles.centered}>
          <Text style={styles.message}>
            {notFound
              ? "Este grupo não existe mais ou você não participa dele."
              : getErrorMessage(error)}
          </Text>
          {!notFound && (
            <Button variant="secondary" onPress={() => refreshGroup()}>
              Tentar novamente
            </Button>
          )}
        </View>
      );
    }

    const isAdmin = group.my_role === "admin";
    const details = [
      { label: "Começou em", value: formatDate(parseApiDate(group.starts_on)) },
      { label: "Fim", value: endsOnLabel(group) },
      { label: "Critério", value: criterionLabels[group.ranking_criterion] },
      {
        label: "Situação",
        value: group.status === "ended" ? "Encerrado" : "Ativo",
      },
    ];

    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{group.name}</Text>
        {group.description && (
          <Text style={styles.description}>{group.description}</Text>
        )}

        <View style={styles.list}>
          {details.map((detail) => (
            <View key={detail.label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{detail.label}</Text>
              <Text style={styles.detailValue}>{detail.value}</Text>
            </View>
          ))}
        </View>
        {isAdmin && (
          <Button
            variant="secondary"
            onPress={() => router.push(`/groups/${group.id}/edit` as Href)}
            style={styles.editButton}
          >
            Editar grupo
          </Button>
        )}

        {isAdmin && group.invite_code && (
          <GroupInvite
            groupId={group.id}
            groupName={group.name}
            code={group.invite_code}
            onRegenerated={refreshGroup}
          />
        )}

        <Text style={styles.sectionTitle}>Membros ({group.members_count})</Text>
        <GroupMembers
          members={group.members}
          currentUserId={user?.id}
          onMemberPress={isAdmin ? handleMemberPress : undefined}
        />
        {isAdmin && <AddMember groupId={group.id} onAdded={refreshGroup} />}

        <Button
          variant="secondary"
          onPress={() => handleLeave(group)}
          style={styles.leaveButton}
          textStyle={styles.leaveText}
        >
          {leavePlan(group, user?.id).buttonLabel}
        </Button>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView
      edges={{ top: "additive", bottom: "off" }}
      style={styles.container}
    >
      <BackButton />
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: theme.colors.gray,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  message: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    lineHeight: 22,
    color: palette.inkSoft,
    textAlign: "center",
  },
  scroll: {
    paddingBottom: 32,
  },
  title: {
    fontFamily: theme.font.bold,
    fontSize: 28,
    color: palette.ink,
  },
  description: {
    marginTop: 8,
    fontFamily: theme.font.regular,
    fontSize: 16,
    lineHeight: 24,
    color: palette.ink,
  },
  list: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray300,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray300,
  },
  detailLabel: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: palette.inkSoft,
  },
  detailValue: {
    flexShrink: 1,
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: palette.ink,
    textAlign: "right",
  },
  editButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 0,
  },
  leaveButton: {
    marginTop: 32,
    alignSelf: "flex-start",
    paddingHorizontal: 0,
  },
  leaveText: {
    color: palette.riskText,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 4,
    fontFamily: theme.font.semiBold,
    fontSize: 20,
    color: palette.ink,
  },
});
