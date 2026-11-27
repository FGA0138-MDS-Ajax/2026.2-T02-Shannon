import { Lucide } from "@react-native-vector-icons/lucide";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, EmptyState, Loading } from "@/components/ui";
import {
  habitCategoryIcons,
  habitCategoryLabels,
} from "@/config/habit-categories";
import { theme } from "@/config/theme";
import type { CheckInCategory, HabitCategory } from "@/services/types/habits";

export interface CategoryStepProps {
  categories: CheckInCategory[] | null;
  onSelect: (category: HabitCategory) => void;
}

// Etapa 1: categorias com hábitos elegíveis (a API já manda em ordem)
export default function CategoryStep({
  categories,
  onSelect,
}: CategoryStepProps) {
  if (categories === null) return <Loading fill />;

  if (categories.length === 0) {
    return (
      <EmptyState
        icon="rabbit"
        title="Nenhum hábito ativo"
        message="Você não tem hábitos ativos para registrar. Crie um na aba de hábitos!"
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.list}>
      {categories.map((item) => (
        <Card
          key={item.name}
          testID={`category-${item.name}`}
          onPress={() => onSelect(item.name)}
          style={styles.row}
        >
          <View style={styles.icon}>
            <Lucide
              name={habitCategoryIcons[item.name]}
              size={16}
              color={theme.colors.primaryDark}
            />
          </View>
          <Text style={styles.name}>{habitCategoryLabels[item.name]}</Text>
          <Text style={styles.count}>{item.habit_count}</Text>
          <Lucide name="chevron-right" size={18} color={theme.colors.subtle} />
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
    paddingVertical: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    flex: 1,
    fontFamily: theme.font.semiBold,
    fontSize: 16,
    color: theme.colors.text,
  },
  count: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
});
