import { Pressable, StyleSheet, Text, View } from "react-native";
import { habitCategoryLabels } from "@/config/habit-categories";
import { theme } from "@/config/theme";
import type { HabitCategory } from "@/services/types/habits";

export interface CategoryPickerProps {
  label?: string;
  value: HabitCategory | null;
  onChange: (category: HabitCategory | null) => void;
  error?: string;
}

const categories = Object.keys(habitCategoryLabels) as HabitCategory[];

export default function CategoryPicker({
  label,
  value,
  onChange,
  error,
}: CategoryPickerProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.options}>
        {categories.map((category) => {
          const isSelected = category === value;
          return (
            <Pressable
              key={category}
              testID={`category-${category}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              // Tocar na categoria já selecionada desmarca
              onPress={() => onChange(isSelected ? null : category)}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                !!error && !isSelected && styles.optionError,
              ]}
            >
              <Text
                style={[styles.optionText, isSelected && styles.textSelected]}
              >
                {habitCategoryLabels[category]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 16,
  },
  label: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.label,
    marginBottom: 6,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 9999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  optionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
  },
  optionError: {
    borderColor: theme.colors.dangerStrong,
  },
  optionText: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.text,
  },
  textSelected: {
    color: theme.colors.surface,
  },
  errorText: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: theme.colors.dangerStrong,
    marginTop: 4,
  },
});
