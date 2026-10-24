import type { PressableStateCallbackType, StyleProp } from "react-native";

export const theme = {
  colors: {
    gray: "#f1eeec",
    primary: "#F5652F",
    primaryDark: "#D15528",
  },
  font: {
    regular: "LibreBaskerville_400Regular",
    medium: "LibreBaskerville_500Medium",
    semiBold: "LibreBaskerville_600SemiBold",
    bold: "LibreBaskerville_700Bold",
  },
};

export type Css<T> =
  | StyleProp<T>
  | ((state: PressableStateCallbackType) => StyleProp<T>);
