import { type ReactNode, useEffect, useRef, useState } from "react";
import { Animated, Easing, type StyleProp, type ViewStyle } from "react-native";

// Sobe mais e desacelera mais devagar no fim ("ease out quint"): a entrada
// fica macia em vez de parar de uma vez
const DURATION = 380;
const RISE = 18;
const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const STAGGER = 50;
const MAX_STAGGER = 6;
// Montou bem depois da troca (ex.: rolando a lista): aparece sem animação
const ANIMATION_WINDOW = 800;

export interface FadeInProps {
  // Quando o conteúdo trocou (`Date.now()`)
  since: number;
  // Posição na lista, para cada item entrar um pouco depois do anterior
  index?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** Conteúdo que entra subindo e aparecendo quando a lista troca */
export default function FadeIn({
  since,
  index = 0,
  style,
  children,
}: FadeInProps) {
  const [animate] = useState(() => Date.now() - since < ANIMATION_WINDOW);
  const progress = useRef(new Animated.Value(animate ? 0 : 1)).current;

  useEffect(() => {
    if (!animate) return;
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      delay: Math.min(index, MAX_STAGGER) * STAGGER,
      easing: EASE,
      useNativeDriver: true,
    }).start();
  }, [animate, index, progress]);

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
