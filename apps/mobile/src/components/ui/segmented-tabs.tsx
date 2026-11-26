import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { theme } from "@/config/theme";
import type { ChipOption } from "./filter-chips";

const PADDING = 3;
const SLIDE_DURATION = 240;

export interface SegmentedTabsProps<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Prefixo do testID de cada aba: `${testIDPrefix}-${value}` */
  testIDPrefix?: string;
}

// Abas de seções de uma tela, com largura igual. Ficam acima dos filtros
// (FilterChips) na hierarquia, por isso têm outro desenho. A pílula branca
// desliza até a aba escolhida.
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  testIDPrefix = "tab",
}: SegmentedTabsProps<T>) {
  const [width, setWidth] = useState(0);
  const tabWidth = width > 0 ? (width - PADDING * 2) / options.length : 0;
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const offset = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);

  useEffect(() => {
    if (tabWidth === 0) return;
    const target = index * tabWidth;
    // Na primeira medida a pílula já nasce no lugar, sem deslizar
    if (!placed.current) {
      offset.setValue(target);
      placed.current = true;
      return;
    }
    const animation = Animated.timing(offset, {
      toValue: target,
      duration: SLIDE_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [index, tabWidth, offset]);

  return (
    <View
      style={styles.container}
      accessibilityRole="tablist"
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
    >
      {tabWidth > 0 && (
        <Animated.View
          style={[
            styles.pill,
            { width: tabWidth, transform: [{ translateX: offset }] },
          ]}
        />
      )}
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
            style={styles.tab}
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
    padding: PADDING,
  },
  pill: {
    position: "absolute",
    top: PADDING,
    bottom: PADDING,
    left: PADDING,
    borderRadius: theme.radius.md - PADDING,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
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
