import { Lucide } from "@react-native-vector-icons/lucide";
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
import GroupRow from "@/components/group-row";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import { getErrorMessage } from "@/services/api-errors";
import { listGroups } from "@/services/groups-api";

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

    return (
      <FlatList
        data={groups}
        keyExtractor={(group) => group.id}
        renderItem={({ item }) => (
          <GroupRow
            name={item.name}
            membersCount={item.members_count}
            role={item.my_role}
            status={item.status}
            onPress={() => router.push(`/groups/${item.id}` as Href)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          groups?.length === 0 && styles.emptyContainer,
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Lucide name="users" size={28} color={theme.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Nenhum grupo por aqui</Text>
            <Text style={styles.message}>
              Crie um grupo para competir com os amigos ou entre com o código
              que alguém te mandou.
            </Text>
          </View>
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

      <View style={styles.content}>{renderContent()}</View>

      <View style={styles.actions}>
        <Button
          width="full"
          onPress={() => router.push("/(app)/groups/create" as Href)}
        >
          Criar grupo
        </Button>
        <Button
          variant="secondary"
          width="full"
          onPress={() => router.push("/(app)/groups/join" as Href)}
        >
          Entrar com código
        </Button>
      </View>
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
  title: {
    marginTop: 16,
    marginBottom: 8,
    fontFamily: theme.font.bold,
    fontSize: 28,
    color: palette.ink,
  },
  content: {
    flex: 1,
  },
  listContent: {
    // Espaço para os dois botões fixos embaixo
    paddingBottom: 120,
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
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: theme.colors.gray200,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: theme.font.semiBold,
    fontSize: 20,
    color: palette.ink,
  },
  actions: {
    position: "absolute",
    bottom: 16,
    left: 24,
    right: 24,
    gap: 4,
  },
});
