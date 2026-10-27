import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
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
import Button from "@/components/button";
import HabitCard from "@/components/habit-card";
import LogoutButton from "@/components/logout-button";
import { theme } from "@/config/theme";
import {
  type Habit,
  type HabitStatus,
  listHabits,
} from "@/services/habits-mock";

const filters: { status: HabitStatus; label: string }[] = [
  { status: "active", label: "Ativos" },
  { status: "finished", label: "Encerrados" },
];

export default function HabitsScreen() {
  const [filter, setFilter] = useState<HabitStatus>("active");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Ignora respostas antigas quando o filtro muda antes da anterior terminar
  const lastRequest = useRef(0);

  const loadHabits = useCallback(
    async (status: HabitStatus, isRefresh = false) => {
      const requestId = ++lastRequest.current;
      setErrorMessage(null);
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const data = await listHabits(status);
        if (requestId === lastRequest.current) {
          setHabits(data);
        }
      } catch {
        if (requestId === lastRequest.current) {
          setErrorMessage(
            "Não foi possível carregar seus hábitos. Verifique sua conexão.",
          );
        }
      } finally {
        if (requestId === lastRequest.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      loadHabits(filter);
    }, [filter, loadHabits]),
  );

  const handleFilterChange = (status: HabitStatus) => {
    if (status === filter) return;
    setHabits([]);
    setFilter(status);
  };

  const renderContent = () => {
    if (loading && habits.length === 0) {
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
          <Button variant="secondary" onPress={() => loadHabits(filter)}>
            Tentar novamente
          </Button>
        </View>
      );
    }

    return (
      <FlatList
        data={habits}
        keyExtractor={(habit) => habit.id}
        renderItem={({ item }) => <HabitCard habit={item} />}
        contentContainerStyle={habits.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {filter === "active"
              ? "Você ainda não tem hábitos ativos. Crie o primeiro!"
              : "Nenhum hábito encerrado."}
          </Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadHabits(filter, true)}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Meus hábitos</Text>
        <LogoutButton />
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
