import { type ReactNode, useEffect, useRef } from "react";
import { Animated, Easing, type StyleProp, type ViewStyle } from "react-native";

const DURATION = 320;
const RISE = 14;
const STAGGER = 50;
const MAX_STAGGER = 6;

export interface FadeInProps {
  children: ReactNode;
  /** Posição numa lista: cada item entra um pouco depois do anterior */
  index?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Conteúdo que entra subindo e aparecendo ao montar. Para animar de novo ao
 * trocar o conteúdo (ex.: outra aba), mude a `key`.
 */
export function FadeIn({ children, index = 0, style }: FadeInProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      delay: Math.min(index, MAX_STAGGER) * STAGGER,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [index, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [RISE, 0],
  });

  return (
    <Animated.View
      style={[style, { opacity: progress, transform: [{ translateY }] }]}
    >
      {children}
    </Animated.View>
  );
}
