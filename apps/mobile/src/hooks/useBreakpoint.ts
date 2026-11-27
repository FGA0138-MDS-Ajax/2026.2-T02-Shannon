import { useWindowDimensions } from "react-native";
import { theme } from "@/config/theme";

export interface Breakpoint {
  width: number;
  height: number;
  /** Tablet ou janela média do navegador: barra de abas vira lateral */
  isTablet: boolean;
  /** Computador ou tablet grande deitado: lateral com o nome ao lado do ícone */
  isDesktop: boolean;
}

/**
 * Tamanho da janela classificado pelos pontos de quebra do tema. Segue a
 * janela (girar o aparelho, redimensionar o navegador), não o aparelho.
 */
export function useBreakpoint(): Breakpoint {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isTablet: width >= theme.breakpoints.tablet,
    isDesktop: width >= theme.breakpoints.desktop,
  };
}
