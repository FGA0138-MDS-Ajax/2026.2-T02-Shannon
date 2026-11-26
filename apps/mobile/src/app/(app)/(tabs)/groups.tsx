import { type Href, router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useSWR from "swr";
import Button from "@/components/button";
import GroupCard, { GroupActionCard } from "@/components/group-card";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import { getErrorMessage } from "@/services/api-errors";
import { listGroups } from "@/services/groups-api";
import type { GroupListItem } from "@/services/types/groups";

// Cada célula da grade: um grupo ou um dos dois cards de ação do fim
type Cell =
  | { kind: "group"; group: GroupListItem; index: number }
  | { kind: "create" }
  | { kind: "join" }
  | { kind: "spacer" };

const COLUMNS = 2;

export default function GroupsScreen() {
  const {
    data: groups,
    error,
    isLoading,
    isValidating,
    mutate: refreshGroups,
  } = useSWR("/groups", listGroups);

  useFocusEffect(
    useCallback(() => {
      refreshGroups();
    }, [refreshGroups]),
  );

  const renderCell = ({ item }: { item: Cell }) => (
    <View style={styles.cell}>
      {item.kind === "group" ? (
        <GroupCard
          name={item.group.name}
          membersCount={item.group.members_count}
          role={item.group.my_role}
          status={item.group.status}
          index={item.index}
          onPress={() => router.push(`/groups/${item.group.id}` as Href)}
        />
      ) : item.kind === "spacer" ? null : item.kind === "create" ? (
        <GroupActionCard
          icon="plus"
          label="Criar grupo"
          onPress={() => router.push("/(app)/groups/create" as Href)}
        />
      ) : (
        <GroupActionCard
          icon="hash"
          label="Entrar com código"
          onPress={() => router.push("/(app)/groups/join" as Href)}
        />
      )}
    </View>
  );

  const renderContent = () => {
    if (isLoading && !groups) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator
            testID="groups-loading"
            size="large"
            color={theme.colors.primary}
          />
        </View>
      );
    }

    if (error && !groups) {
      return (
        <View style={styles.centered}>
          <Text style={styles.message}>{getErrorMessage(error)}</Text>
          <Button variant="secondary" onPress={() => refreshGroups()}>
            Tentar novamente
          </Button>
        </View>
      );
    }

    const cells: Cell[] = [
      ...(groups ?? []).map(
        (group, index) => ({ kind: "group", group, index }) as const,
      ),
      { kind: "create" },
      { kind: "join" },
    ];
    // Linha incompleta no fim: um espaço vazio mantém os cards do mesmo tamanho
    if (cells.length % COLUMNS !== 0) cells.push({ kind: "spacer" });

    return (
      <FlatList
        data={cells}
        numColumns={COLUMNS}
        keyExtractor={(cell) =>
          cell.kind === "group" ? cell.group.id : cell.kind
        }
        renderItem={renderCell}
        columnWrapperStyle={styles.row}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          groups?.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nenhum grupo por aqui</Text>
              <Text style={styles.message}>
                Crie um grupo para competir com os amigos ou entre com o código
                que alguém te mandou.
              </Text>
            </View>
          ) : undefined
        }
        refreshControl={
          <RefreshControl
            refreshing={isValidating && !!groups}
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
    <SafeAreaView
      edges={{ top: "additive", bottom: "off" }}
      style={styles.container}
    >
      <Text style={styles.title}>Grupos</Text>
      <Text style={styles.subtitle}>Constância é melhor com companhia.</Text>

      <View style={styles.content}>{renderContent()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    backgroundColor: palette.background,
  },
  title: {
    marginTop: 16,
    fontFamily: theme.font.medium,
    fontSize: 28,
    color: palette.ink,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: palette.inkSoft,
  },
  content: {
    flex: 1,
  },
  // Largura toda para a barra de rolagem não ficar por cima dos cards
  list: {
    marginHorizontal: -22,
  },
  listContent: {
    paddingHorizontal: 22,
    paddingBottom: 32,
    gap: 12,
  },
  row: {
    gap: 12,
  },
  // Cada célula divide a linha por igual
  cell: {
    flex: 1,
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
  },
  empty: {
    gap: 6,
    marginBottom: 6,
  },
  emptyTitle: {
    fontFamily: theme.font.medium,
    fontSize: 20,
    color: palette.ink,
  },
});
