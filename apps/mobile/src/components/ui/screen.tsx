import { Lucide } from "@react-native-vector-icons/lucide";
import { router } from "expo-router";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/config/theme";

export interface ScreenProps {
  children: ReactNode;
  /** Telas de formulário: o conteúdo sobe junto com o teclado no iOS */
  keyboardAvoiding?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Fundo e margens de todas as telas. O rodapé fica livre para a tab bar.
export function Screen({
  children,
  keyboardAvoiding = false,
  style,
}: ScreenProps) {
  return (
    <SafeAreaView
      edges={{ top: "additive", bottom: keyboardAvoiding ? "additive" : "off" }}
      style={[styles.container, style]}
    >
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {children}
        </KeyboardAvoidingView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Ação à direita do título (ex.: "Cancelar", "Editar") */
  action?: ReactNode;
}

export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {action}
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

export interface HeaderActionProps {
  label: string;
  onPress: () => void;
  /** Sobre o cabeçalho escuro (HeroLayout): laranja claro */
  onHero?: boolean;
  testID?: string;
}

// Link de texto do cabeçalho, no tom escuro do laranja
export function HeaderAction({
  label,
  onPress,
  onHero = false,
  testID,
}: HeaderActionProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      style={styles.headerAction}
    >
      <Text style={[styles.headerActionText, onHero && styles.onHeroAction]}>
        {label}
      </Text>
    </Pressable>
  );
}

export interface BackButtonProps {
  /** Lido pelo leitor de tela; a seta não tem texto */
  label?: string;
  /** Sobre o cabeçalho escuro: seta clara */
  onHero?: boolean;
}

export function BackButton({
  label = "Voltar",
  onHero = false,
}: BackButtonProps) {
  return (
    <Pressable
      testID="back-button"
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={12}
      style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
    >
      <Lucide
        name="chevron-left"
        size={26}
        color={onHero ? theme.colors.onHero : theme.colors.text}
      />
    </Pressable>
  );
}

// Botão principal fixo no rodapé, por cima da lista
export function FloatingAction({ children }: { children: ReactNode }) {
  return <View style={styles.floating}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: 16,
    backgroundColor: theme.colors.gray,
  },
  keyboard: {
    flex: 1,
  },
  header: {
    marginTop: 16,
    marginBottom: 16,
    gap: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flex: 1,
    fontFamily: theme.font.bold,
    fontSize: 28,
    color: theme.colors.text,
  },
  subtitle: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
  headerAction: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  headerActionText: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: theme.colors.primaryDark,
  },
  onHeroAction: {
    fontSize: 15,
    color: theme.colors.primary,
  },
  pressed: {
    opacity: 0.6,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  floating: {
    zIndex: 1,
    position: "absolute",
    bottom: 24,
    left: theme.spacing.screen,
    right: theme.spacing.screen,
    gap: 8,
  },
});
