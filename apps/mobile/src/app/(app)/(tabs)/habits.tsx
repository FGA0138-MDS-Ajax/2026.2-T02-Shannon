import { router } from "expo-router";
import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import useSWR from "swr";
import Button from "@/components/button";
import HabitCard from "@/components/habit-card";
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
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { request } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import { habitKeys } from "@/services/habits-api";
import type { HabitStatus, HabitWithProgress } from "@/services/types/habits";

const filters: ChipOption<HabitStatus>[] = [
  { value: "active", label: "Ativos" },
  { value: "finished", label: "Encerrados" },
];

export default function HabitsScreen() {
  const [filter, setFilter] = useState<HabitStatus>("active");
  const {
    data: habits,
    error,
    isLoading,
    mutate: refreshHabits,
  } = useSWR<HabitWithProgress[]>(habitKeys.list(filter), request);

  useRefreshOnFocus(refreshHabits);

  const renderContent = () => {
    if (isLoading && !habits) return <Loading testID="habits-loading" fill />;

    if (error) {
      return (
        <ErrorBanner
          message={getErrorMessage(error)}
          onRetry={() => refreshHabits()}
        />
      );
    }

    return (
      <FlatList
        data={habits}
        keyExtractor={(habit) => habit.id}
        renderItem={({ item }) => (
          <HabitCard
            habit={item}
            onPress={() => router.push(`/habits/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon={filter === "active" ? "rabbit" : "archive"}
            title={
              filter === "active"
                ? "Você ainda não tem hábitos ativos. Crie o primeiro!"
                : "Nenhum hábito encerrado."
            }
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              refreshHabits();
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
      <ScreenHeader title="Meus hábitos" />

      <View style={styles.filters}>
        <FilterChips options={filters} value={filter} onChange={setFilter} />
      </View>

      <View style={styles.content}>{renderContent()}</View>

      <FloatingAction>
        <Button
          width="full"
          onPress={() => router.push("/(app)/habits/create")}
        >
          Novo hábito
        </Button>
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
  // Espaço para o último card não ficar atrás do botão flutuante
  list: {
    paddingBottom: 96,
  },
});
