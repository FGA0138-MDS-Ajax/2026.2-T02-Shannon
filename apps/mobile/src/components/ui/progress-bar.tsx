import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { theme } from "@/config/theme";

const FILL_DURATION = 600;

export interface ProgressBarProps {
  /** Parte feita, de 0 a 1. Passando de 1 (meta superada), a barra para cheia. */
  ratio: number;
  /** Verde quando a meta foi cumprida */
  tone?: "primary" | "success";
  /** Trilha mais escura, para o cabeçalho escuro (HeroLayout) */
  onHero?: boolean;
  /** 6 nas listas, 8 em destaque */
  height?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Barra de progresso de metas e porcentagens. Enche do zero ao aparecer.
export function ProgressBar({
  ratio,
  tone = "primary",
  onHero = false,
  height = 6,
  style,
  testID,
}: ProgressBarProps) {
  const percent = Math.round(Math.max(0, Math.min(ratio, 1)) * 100);
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(fill, {
      toValue: percent,
      duration: FILL_DURATION,
      easing: Easing.out(Easing.cubic),
      // Largura em porcentagem não anima no nativo; é uma view só
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [fill, percent]);

  return (
    <View
      testID={testID}
      style={[styles.track, onHero && styles.trackOnHero, { height }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <Animated.View
        style={[
          styles.fill,
          tone === "success" && styles.success,
          {
            width: fill.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.gray200,
    overflow: "hidden",
  },
  trackOnHero: {
    backgroundColor: theme.colors.heroRaised,
  },
  fill: {
    height: "100%",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
  },
  success: {
    backgroundColor: theme.colors.success,
  },
});
