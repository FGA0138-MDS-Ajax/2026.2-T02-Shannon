import { type ReactNode, useRef } from "react";
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

const PRESSED_SCALE = 0.97;

export interface PressableScaleProps
  extends Omit<PressableProps, "style" | "children"> {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** Botão que encolhe de leve no toque e volta com mola, em vez de piscar */
export default function PressableScale({
  style,
  children,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const springTo = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      speed: 40,
      bounciness: 4,
      useNativeDriver: true,
    }).start();

  return (
    <Pressable
      {...props}
      onPressIn={(event) => {
        springTo(PRESSED_SCALE);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        springTo(1);
        onPressOut?.(event);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
