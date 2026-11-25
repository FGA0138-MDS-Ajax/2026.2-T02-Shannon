import {
  type Href,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import useSWR from "swr";
import GroupFeed from "@/components/groups/group-feed";
import GroupHabits from "@/components/groups/group-habits";
import GroupMembers from "@/components/groups/group-members";
import GroupOverview from "@/components/groups/group-overview";
import GroupRanking from "@/components/groups/group-ranking";
import {
  BackButton,
  CenteredMessage,
  type ChipOption,
  ErrorBanner,
  HeaderAction,
  Loading,
  Screen,
  SegmentedTabs,
} from "@/components/ui";
import { theme } from "@/config/theme";
import { ApiError, request } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import { groupKeys } from "@/services/groups-api";
import type { GroupDetail } from "@/services/types/groups";

type Tab = "habits" | "feed" | "ranking" | "members";

const tabs: ChipOption<Tab>[] = [
  { value: "habits", label: "Hábitos" },
  { value: "feed", label: "Feed" },
  { value: "ranking", label: "Ranking" },
  { value: "members", label: "Membros" },
];

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("habits");
  const {
    data: group,
    error,
    isValidating,
    mutate: refreshGroup,
  } = useSWR<GroupDetail>(groupKeys.detail(id), request);

  useFocusEffect(
    useCallback(() => {
      refreshGroup();
    }, [refreshGroup]),
  );

  const onChanged = () => {
    refreshGroup();
  };

  const renderTab = (group: GroupDetail) => {
    switch (tab) {
      case "habits":
        return <GroupHabits group={group} />;
      case "feed":
        return <GroupFeed groupId={group.id} />;
      case "ranking":
        return <GroupRanking groupId={group.id} />;
      case "members":
        return <GroupMembers group={group} onChanged={onChanged} />;
    }
  };

  const renderContent = () => {
    // 404: o grupo não existe ou a pessoa saiu dele
    if (error instanceof ApiError && error.status === 404) {
      return <CenteredMessage message="Grupo não encontrado." />;
    }
    if (error && !group) {
      return (
        <ErrorBanner
          message={getErrorMessage(error)}
          onRetry={() => refreshGroup()}
        />
      );
    }
    if (!group) return <Loading testID="group-loading" fill />;

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isValidating && !!group}
            onRefresh={onChanged}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <GroupOverview group={group} onChanged={onChanged} />
        <View style={styles.tabs}>
          <SegmentedTabs
            options={tabs}
            value={tab}
            onChange={setTab}
            testIDPrefix="group-tab"
          />
        </View>
        {renderTab(group)}
      </ScrollView>
    );
  };

  return (
    <Screen>
      <View style={styles.topBar}>
        <BackButton />
        {group?.my_role === "admin" && (
          <HeaderAction
            testID="edit-group-button"
            label="Editar"
            onPress={() => router.push(`/groups/${id}/edit` as Href)}
          />
        )}
      </View>
      {renderContent()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  scroll: {
    paddingBottom: 48,
  },
  tabs: {
    marginTop: 20,
    marginBottom: 16,
  },
});
