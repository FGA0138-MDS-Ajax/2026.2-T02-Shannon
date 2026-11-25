import { type Href, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import useSWR from "swr";
import Button from "@/components/button";
import HabitCard from "@/components/habit-card";
import {
  type ChipOption,
  EmptyState,
  ErrorBanner,
  FilterChips,
  Loading,
} from "@/components/ui";
import { request } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import { groupKeys } from "@/services/groups-api";
import type { GroupDetail, GroupHabit } from "@/services/types/groups";
import type { HabitStatus } from "@/services/types/habits";

const filters: ChipOption<HabitStatus>[] = [
  { value: "active", label: "Ativos" },
  { value: "finished", label: "Encerrados" },
];

export default function GroupHabits({ group }: { group: GroupDetail }) {
  const [filter, setFilter] = useState<HabitStatus>("active");
  const {
    data: habits,
    error,
    mutate: refreshHabits,
  } = useSWR<GroupHabit[]>(groupKeys.habits(group.id, filter), request);

  useFocusEffect(
    useCallback(() => {
      refreshHabits();
    }, [refreshHabits]),
  );

  const canCreate = group.my_role === "admin" && group.status === "active";

  const renderList = () => {
    if (error && !habits) {
      return (
        <ErrorBanner
          message={getErrorMessage(error)}
          onRetry={() => refreshHabits()}
        />
      );
    }
    if (!habits) return <Loading testID="group-habits-loading" />;
    if (habits.length === 0) {
      return (
        <EmptyState
          testID="group-habits-empty"
          icon="rabbit"
          title={
            filter === "active"
              ? "Nenhum hábito ativo"
              : "Nenhum hábito encerrado"
          }
          message={
            filter === "active"
              ? canCreate
                ? "Crie o primeiro hábito para o grupo acompanhar junto."
                : "Os administradores ainda não criaram hábitos."
              : undefined
          }
        />
      );
    }
    return habits.map((habit) => (
      <HabitCard
        key={habit.id}
        habit={habit}
        hideGroupName
        onPress={() =>
          router.push(`/groups/${group.id}/habits/${habit.id}` as Href)
        }
      />
    ));
  };

  return (
    <View>
      <View style={styles.toolbar}>
        <FilterChips
          options={filters}
          value={filter}
          onChange={setFilter}
          testIDPrefix="group-habits-filter"
        />
      </View>
      {renderList()}
      {canCreate && (
        <Button
          testID="create-group-habit-button"
          width="full"
          style={styles.create}
          onPress={() =>
            router.push(`/groups/${group.id}/habits/create` as Href)
          }
        >
          Novo hábito do grupo
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    marginBottom: 12,
  },
  create: {
    marginTop: 4,
  },
});
