import { type Href, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useSWR from "swr";
import Button from "@/components/button";
import HabitCard from "@/components/habit-card";
import { theme } from "@/config/theme";
import { request, toQueryString } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import type { HabitStatus, HabitWithProgress } from "@/services/types/habits";

const filters: { status: HabitStatus; label: string }[] = [
  { status: "active", label: "Ativos" },
  { status: "finished", label: "Encerrados" },
];

export default function HabitsScreen() {
  const [filter, setFilter] = useState<HabitStatus>("active");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    data: habits,
    isLoading,
    mutate: refreshHabits,
  } = useSWR<HabitWithProgress[]>(
    `/habits${toQueryString({ status: filter })}`,
    request,
    {
      onError: (error) => setErrorMessage(getErrorMessage(error)),
    },
  );

  useFocusEffect(
    useCallback(() => {
      refreshHabits();
    }, [refreshHabits]),
  );

  const handleFilterChange = (status: HabitStatus) => {
    if (status === filter) return;
    setFilter(status);
  };

  const renderContent = () => {
    if (isLoading && !habits) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
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
          <HabitCard
            habit={item}
            // Cast: os tipos gerados pelo Expo ainda não reconhecem o [id]
            onPress={() => router.push(`/habits/${item.id}` as Href)}
          />
        )}
        contentContainerStyle={[
          { paddingBottom: 74 },
          !habits && styles.emptyContainer,
        ]}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {filter === "active"
              ? "Você ainda não tem hábitos ativos. Crie o primeiro!"
              : "Nenhum hábito encerrado."}
          </Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => refreshHabits()}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />
    );
  };

  return (
    <SafeAreaView
      edges={{
        top: "additive",
        bottom: "off",
      }}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Meus hábitos</Text>
      </View>

      <View style={styles.filters}>
        {filters.map(({ status, label }) => {
          const isSelected = status === filter;
          return (
            <Pressable
              key={status}
              testID={`filter-${status}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              onPress={() => handleFilterChange(status)}
              style={[styles.filter, isSelected && styles.filterSelected]}
            >
              <Text
                style={[
                  styles.filterText,
                  isSelected && styles.filterTextSelected,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.content}>{renderContent()}</View>

      <View style={styles.actions}>
        <Button
          variant="primary"
          width="full"
          onPress={() => router.push("/(app)/habits/create" as Href)}
        >
          Novo hábito
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
  header: {
    marginTop: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: theme.font.bold,
    fontSize: 28,
    color: "#1C1917",
  },
  filters: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filter: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8D2CD",
    borderRadius: 9999,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  filterSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
  },
  filterText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: "#1C1917",
  },
  filterTextSelected: {
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
  actions: {
    zIndex: 1,
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  errorBannerText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: "#B91C1C",
    textAlign: "center",
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: "#6B6560",
    textAlign: "center",
    lineHeight: 22,
  },
});
