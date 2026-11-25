import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  type LayoutRectangle,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";

export type GroupTab = "overview" | "ranking" | "about" | "habits";

const TABS: { key: GroupTab; label: string }[] = [
  { key: "overview", label: "Visão geral" },
  { key: "ranking", label: "Ranking" },
  { key: "about", label: "Sobre" },
  { key: "habits", label: "Hábitos" },
];

const SLIDE_DURATION = 240;

export interface GroupTabsProps {
  value: GroupTab;
  onChange: (tab: GroupTab) => void;
}

/** Barra "Visão geral | Ranking | Sobre | Hábitos"; a pílula laranja desliza até a aba */
export default function GroupTabs({ value, onChange }: GroupTabsProps) {
  // Posição e largura de cada aba, medidas na tela, para a pílula ir até ela
  const [layouts, setLayouts] = useState<
    Partial<Record<GroupTab, LayoutRectangle>>
  >({});
  const left = useRef(new Animated.Value(0)).current;
  const width = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);
  const active = layouts[value];

  useEffect(() => {
    if (!active) return;
    // Na primeira vez a pílula só aparece no lugar, sem deslizar
    if (!placed.current) {
      left.setValue(active.x);
      width.setValue(active.width);
      placed.current = true;
      return;
    }
    const slide = (target: Animated.Value, toValue: number) =>
      Animated.timing(target, {
        toValue,
        duration: SLIDE_DURATION,
        easing: Easing.out(Easing.cubic),
        // `left` e `width` não animam no nativo; é uma view só, não pesa
        useNativeDriver: false,
      });
    Animated.parallel([
      slide(left, active.x),
      slide(width, active.width),
    ]).start();
  }, [active, left, width]);

  return (
    <View style={styles.bar}>
      {active && <Animated.View style={[styles.pill, { left, width }]} />}
      {TABS.map((tab) => {
        const selected = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            onLayout={({ nativeEvent }) =>
              setLayouts((current) => ({
                ...current,
                [tab.key]: nativeEvent.layout,
              }))
            }
            style={styles.tab}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    padding: 4,
    gap: 4,
    backgroundColor: palette.pill,
    borderRadius: 18,
  },
  pill: {
    position: "absolute",
    top: 4,
    bottom: 4,
    borderRadius: 14,
    backgroundColor: palette.orange,
  },
  tab: {
    flexGrow: 1,
    height: 38,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: theme.font.medium,
    fontSize: 11,
    color: palette.inkSoft,
  },
  labelSelected: {
    fontFamily: theme.font.semiBold,
    color: palette.ink,
  },
});
