import { Lucide } from "@react-native-vector-icons/lucide";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import useSWR from "swr";
import Button from "@/components/button";
import {
  Card,
  type ChipOption,
  EmptyState,
  ErrorBanner,
  FadeIn,
  FilterChips,
  Loading,
} from "@/components/ui";
import { describeGoal } from "@/config/goal-labels";
import { theme } from "@/config/theme";
import type { GroupPeriodData } from "@/hooks/useGroupPeriod";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { request } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import { groupKeys } from "@/services/groups-api";
import type { GroupDetail, GroupHabit } from "@/services/types/groups";
import type { HabitStatus } from "@/services/types/habits";
import type { HabitPeriod } from "@/utils/group-period";
import { plural } from "@/utils/text";

const filters: ChipOption<HabitStatus>[] = [
  { value: "active", label: "Ativos" },
  { value: "finished", label: "Encerrados" },
];

export interface GroupHabitsProps {
  group: GroupDetail;
  period?: GroupPeriodData;
}

/** Folha da aba Hábitos: cada hábito com quantos integrantes já cumpriram a meta */
export default function GroupHabits({ group, period }: GroupHabitsProps) {
  const [filter, setFilter] = useState<HabitStatus>("active");
  const {
    data: habits,
    error,
    mutate: refreshHabits,
  } = useSWR<GroupHabit[]>(groupKeys.habits(group.id, filter), request);

  useRefreshOnFocus(refreshHabits);

  const canCreate = group.my_role === "admin" && group.status === "active";
  // Hábito sem meta não tem o que contar: fica sem o "N/M"
  const periodByHabit = new Map(
    period?.habits
      .filter((habit) => habit.total > 0)
      .map((habit) => [habit.habitId, habit]),
  );

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
    return (
      <View style={styles.list}>
        {habits.map((habit, index) => (
          <FadeIn key={habit.id} index={index}>
            <GroupHabitRow
              habit={habit}
              period={periodByHabit.get(habit.id)}
              onPress={() =>
                router.push(`/groups/${group.id}/habits/${habit.id}`)
              }
            />
          </FadeIn>
        ))}
      </View>
    );
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
          onPress={() => router.push(`/groups/${group.id}/habits/create`)}
        >
          Novo hábito do grupo
        </Button>
      )}
    </View>
  );
}

interface GroupHabitRowProps {
  habit: GroupHabit;
  /** Só nos ativos com meta: quantos já cumpriram */
  period?: HabitPeriod;
  onPress: () => void;
}

function GroupHabitRow({ habit, period, onPress }: GroupHabitRowProps) {
  const allDone = !!period && period.done === period.total;
  return (
    <Card
      testID={`group-habit-${habit.id}`}
      onPress={onPress}
      accessibilityLabel={`Hábito ${habit.name}`}
      style={styles.row}
    >
      <View style={styles.rowTexts}>
        <Text style={styles.rowName} numberOfLines={1}>
          {habit.name}
        </Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {habit.goal ? describeGoal(habit.goal) : "Sem meta"}
          {habit.description ? ` · ${habit.description}` : ""}
        </Text>
        {period && (
          <Text
            style={[styles.rowCount, allDone && styles.rowCountDone]}
            numberOfLines={1}
          >
            {period.done} de {plural(period.total, "integrante", "integrantes")}{" "}
            {period.done === 1 ? "cumpriu" : "cumpriram"} a meta
          </Text>
        )}
      </View>
      <Lucide name="chevron-right" size={18} color={theme.colors.subtle} />
    </Card>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowTexts: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontFamily: theme.font.bold,
    fontSize: 16,
    color: theme.colors.text,
  },
  rowDetail: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  rowCount: {
    fontFamily: theme.font.medium,
    fontSize: 12,
    color: theme.colors.primaryDark,
  },
  rowCountDone: {
    color: theme.colors.success,
  },
  create: {
    marginTop: 16,
  },
});
