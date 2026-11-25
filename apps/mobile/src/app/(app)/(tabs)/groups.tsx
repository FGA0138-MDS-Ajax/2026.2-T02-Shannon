import { type Href, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import useSWR from "swr";
import Button from "@/components/button";
import GroupCard from "@/components/group-card";
import {
  type ChipOption,
  EmptyState,
  ErrorBanner,
  FilterChips,
  FloatingAction,
  Loading,
  Screen,
  ScreenHeader,
} from "@/components/ui";
import { theme } from "@/config/theme";
import { request } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import { groupKeys } from "@/services/groups-api";
import type { GroupListItem, GroupStatus } from "@/services/types/groups";

const filters: ChipOption<GroupStatus>[] = [
  { value: "active", label: "Ativos" },
  { value: "ended", label: "Encerrados" },
];

export default function GroupsScreen() {
  const [filter, setFilter] = useState<GroupStatus>("active");
  const {
    data: groups,
    error,
    isLoading,
    isValidating,
    mutate: refreshGroups,
  } = useSWR<GroupListItem[]>(groupKeys.list, request);

  useFocusEffect(
    useCallback(() => {
      refreshGroups();
    }, [refreshGroups]),
  );

  // A API devolve todos de uma vez: o filtro é só local
  const visible = groups?.filter((group) => group.status === filter) ?? [];

  const renderContent = () => {
    if (isLoading && !groups) return <Loading testID="groups-loading" fill />;

    if (error && !groups) {
      return (
        <ErrorBanner
          message={getErrorMessage(error)}
          onRetry={() => refreshGroups()}
        />
      );
    }

    return (
      <FlatList
        data={visible}
        keyExtractor={(group) => group.id}
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            onPress={() => router.push(`/groups/${item.id}` as Href)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          filter === "active" ? (
            <EmptyState
              testID="groups-empty"
              icon="users"
              title="Nenhum grupo ativo"
              message="Crie um grupo ou entre com o código de convite de um amigo para acompanhar hábitos juntos."
            />
          ) : (
            <EmptyState
              testID="groups-empty"
              icon="archive"
              title="Nenhum grupo encerrado"
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={isValidating && !isLoading}
            onRefresh={() => {
              refreshGroups();
            }}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Meus grupos" />

      <View style={styles.filters}>
        <FilterChips options={filters} value={filter} onChange={setFilter} />
      </View>

      <View style={styles.content}>{renderContent()}</View>

      <FloatingAction>
        <View style={styles.actions}>
          <Button
            testID="join-group-button"
            variant="outline"
            style={styles.action}
            onPress={() => router.push("/groups/join" as Href)}
          >
            Usar código
          </Button>
          <Button
            testID="create-group-button"
            style={styles.action}
            onPress={() => router.push("/groups/create" as Href)}
          >
            Novo grupo
          </Button>
        </View>
      </FloatingAction>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    marginBottom: 16,
  },
  content: {
    flex: 1,
  },
  list: {
    paddingBottom: 96,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  action: {
    flex: 1,
    paddingHorizontal: 12,
  },
});
