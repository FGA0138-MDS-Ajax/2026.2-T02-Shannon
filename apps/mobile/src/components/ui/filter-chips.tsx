import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/config/theme";

export interface ChipOption<T extends string | number> {
  value: T;
  label: string;
}

export interface FilterChipsProps<T extends string | number> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Prefixo do testID de cada chip: `${testIDPrefix}-${value}` */
  testIDPrefix?: string;
}

// Pílulas de filtro de seleção única, as mesmas da lista de hábitos.
// Quebram linha quando não cabem: nenhuma fica cortada na margem.
export function FilterChips<T extends string | number>({
  options,
  value,
  onChange,
  testIDPrefix = "filter",
}: FilterChipsProps<T>) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={`${testIDPrefix}-${option.value}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => {
              if (!isSelected) onChange(option.value);
            }}
            style={[styles.chip, isSelected && styles.chipSelected]}
          >
            <Text style={[styles.text, isSelected && styles.textSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
  },
  text: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.text,
  },
  textSelected: {
    color: theme.colors.surface,
  },
});
