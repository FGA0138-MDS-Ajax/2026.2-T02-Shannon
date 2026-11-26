import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/config/theme";
import type { ChipOption } from "./filter-chips";

export interface SegmentedTabsProps<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Prefixo do testID de cada aba: `${testIDPrefix}-${value}` */
  testIDPrefix?: string;
}

// Abas de seções de uma tela, com largura igual. Ficam acima dos filtros
// (FilterChips) na hierarquia, por isso têm outro desenho.
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  testIDPrefix = "tab",
}: SegmentedTabsProps<T>) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
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
            style={[styles.tab, isSelected && styles.tabSelected]}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.text, isSelected && styles.textSelected]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: theme.colors.gray200,
    borderRadius: theme.radius.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    borderRadius: theme.radius.md - 3,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabSelected: {
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  text: {
    fontFamily: theme.font.medium,
    fontSize: 13,
    color: theme.colors.muted,
  },
  textSelected: {
    fontFamily: theme.font.semiBold,
    color: theme.colors.text,
  },
});
