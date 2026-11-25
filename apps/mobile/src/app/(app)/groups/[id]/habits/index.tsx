import {
  type Href,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useSWR from "swr";
import BackButton from "@/components/back-button";
import Button from "@/components/button";
import GroupHabitRow from "@/components/group-habit-row";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import { useGroup } from "@/hooks/useGroup";
import { getErrorMessage } from "@/services/api-errors";
import { listGroupHabits } from "@/services/groups-api";

export default function GroupHabitsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: group, mutate: refreshGroup } = useGroup(id);
  const {
    data: habits,
    error,
    isLoading,
    mutate: refreshHabits,
  } = useSWR(`/groups/${id}/habits`, () => listGroupHabits(id));

  useFocusEffect(
    useCallback(() => {
      refreshGroup();
      refreshHabits();
    }, [refreshGroup, refreshHabits]),
  );

  // Só admin cria, e só enquanto o grupo está ativo
  const canCreate = group?.my_role === "admin" && group.status === "active";

  const renderContent = () => {
    if (isLoading && !habits) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    if (error && !habits) {
      return (
        <View style={styles.centered}>
          <Text style={styles.message}>{getErrorMessage(error)}</Text>
          <Button variant="secondary" onPress={() => refreshHabits()}>
            Tentar novamente
          </Button>
        </View>
      );
    }

    return (
      <FlatList
        data={habits}
        keyExtractor={(habit) => habit.id}
        renderItem={({ item }) => (
          <GroupHabitRow
            habit={item}
            onPress={() =>
              router.push(`/groups/${id}/habits/${item.id}` as Href)
            }
          />
        )}
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          habits?.length === 0 && styles.emptyContainer,
        ]}
        ListEmptyComponent={
          <Text style={styles.message}>
            {canCreate
              ? "Crie o primeiro hábito para o grupo começar a pontuar."
              : "O grupo ainda não tem hábitos. Quem é admin pode criar."}
          </Text>
        }
      />
    );
  };

  return (
    <SafeAreaView
      edges={{ top: "additive", bottom: "off" }}
      style={styles.container}
    >
      <BackButton />
      <Text style={styles.title}>Hábitos do grupo</Text>
      {group && <Text style={styles.subtitle}>{group.name}</Text>}

      <View style={styles.content}>{renderContent()}</View>

      {canCreate && (
        <View style={styles.actions}>
          <Button
            width="full"
            onPress={() => router.push(`/groups/${id}/habits/create` as Href)}
          >
            Novo hábito do grupo
          </Button>
        </View>
      )}
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
    fontFamily: theme.font.bold,
    fontSize: 28,
    color: palette.ink,
  },
  subtitle: {
    marginBottom: 8,
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: palette.inkSoft,
  },
  content: {
    flex: 1,
  },
  // Largura toda para a barra de rolagem não ficar por cima das linhas
  list: {
    marginHorizontal: -24,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 96,
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
  actions: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
  },
});
