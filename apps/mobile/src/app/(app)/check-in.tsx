import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "@/components/button";
import LogoutButton from "@/components/logout-button";
import { habitCategoryLabels } from "@/config/habit-categories";
import { theme } from "@/config/theme";
import { getErrorMessage } from "@/services/api-errors";
import {
  listCheckInCategories,
  listHabitOptions,
} from "@/services/check-ins-api";
import type {
  CheckInCategory,
  HabitCategory,
  HabitOption,
} from "@/services/types/habits";

export default function CheckInScreen() {
  // null = ainda carregando; [] = carregou, mas não há hábito elegível
  const [categories, setCategories] = useState<CheckInCategory[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Em qual tela do fluxo a pessoa está
  const [step, setStep] = useState<"categories" | "habits">("categories");
  const [category, setCategory] = useState<HabitCategory | null>(null);
  // null = carregando os hábitos da categoria
  const [options, setOptions] = useState<HabitOption[] | null>(null);
  // Ids marcados. Fica separado de options: o preselected é a sugestão da
  // API, o selected é o que a pessoa decidiu
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadCategories = useCallback(async () => {
    setCategories(null);
    setErrorMessage(null);
    try {
      const data = await listCheckInCategories();
      setCategories(data.categories);
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    }
  }, []);

  // A aba continua montada ao trocar de aba: recarrega sempre que ela volta
  // pro foco, senão um hábito criado agora não apareceria aqui
  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories]),
  );

  const openCategory = async (name: HabitCategory) => {
    setStep("habits");
    setCategory(name);
    setOptions(null);
    setErrorMessage(null);
    try {
      const page = await listHabitOptions({ category: name });
      setOptions(page.items);
      // Começa marcando só o que a API sugeriu (em "outros" ela não sugere nada)
      const suggested = page.items.filter((habit) => habit.preselected);
      setSelected(new Set(suggested.map((habit) => habit.id)));
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    }
  };

  const backToCategories = () => {
    setStep("categories");
    setSelected(new Set());
  };

  const renderCategories = () => {
    if (categories === null) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    if (categories.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.subtitle}>
            Você não tem hábitos ativos para registrar. Crie um na aba de
            hábitos!
          </Text>
        </View>
      );
    }

    // A API já manda em ordem alfabética, com "outros" por último
    return (
      <ScrollView contentContainerStyle={styles.list}>
        {categories.map((item) => (
          <Pressable
            key={item.name}
            style={styles.category}
            onPress={() => openCategory(item.name)}
          >
            <Text style={styles.categoryName}>
              {habitCategoryLabels[item.name]}
            </Text>
            <Text style={styles.categoryCount}>{item.habit_count}</Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  };

  const renderHabits = () => {
    if (options === null) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.list}>
        {options.map((habit) => {
          const isSelected = selected.has(habit.id);
          return (
            <View
              key={habit.id}
              style={[styles.habit, isSelected && styles.habitSelected]}
            >
              <Text style={styles.categoryName}>{habit.name}</Text>
              <Text style={styles.categoryCount}>{isSelected ? "✓" : ""}</Text>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderContent = () => {
    // O erro vale pras duas telas; o botão repete o que falhou
    if (errorMessage) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Button
            variant="secondary"
            onPress={() =>
              step === "habits" && category
                ? openCategory(category)
                : loadCategories()
            }
          >
            Tentar novamente
          </Button>
        </View>
      );
    }

    return step === "categories" ? renderCategories() : renderHabits();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Check-in</Text>
        <LogoutButton />
      </View>
      {step === "categories" ? (
        <Text style={styles.subtitle}>Escolha uma categoria</Text>
      ) : (
        <Pressable onPress={backToCategories}>
          <Text style={styles.subtitle}>
            ← {category && habitCategoryLabels[category]}
          </Text>
        </Pressable>
      )}
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: theme.colors.gray,
  },
  header: {
    marginTop: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: theme.font.bold,
    fontSize: 28,
    color: "#1C1917",
  },
  subtitle: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: "#6B6560",
    lineHeight: 22,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: "#B91C1C",
    textAlign: "center",
  },
  list: {
    gap: 8,
    paddingVertical: 16,
  },
  category: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  categoryName: {
    fontFamily: theme.font.bold,
    fontSize: 16,
    color: "#1C1917",
  },
  categoryCount: {
    fontFamily: theme.font.regular,
    fontSize: 16,
    color: "#6B6560",
  },
  habit: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "transparent",
  },
  habitSelected: {
    borderColor: theme.colors.primary,
  },
});
