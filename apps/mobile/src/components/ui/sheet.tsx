import { Lucide } from "@react-native-vector-icons/lucide";
import { type ReactNode, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/config/theme";

export interface SheetProps {
  visible: boolean;
  /** Rótulo pequeno em cima do conteúdo (ex.: "CHECK-IN DO GRUPO") */
  eyebrow: string;
  onClose: () => void;
  children: ReactNode;
  testID?: string;
}

const SLIDE_DISTANCE = 320;
const SLIDE_DURATION = 260;
// A folha nunca passa de 85% da tela; o conteúdo maior rola dentro dela
const MAX_HEIGHT = 0.85;

/**
 * Folha que sobe de baixo, por cima da tela: detalhes do feed do grupo e
 * check-in rápido. O fundo escurece aos poucos e só a folha desliza. Tocar
 * fora, no × ou no "voltar" do Android fecha.
 */
export function Sheet({
  visible,
  eyebrow,
  onClose,
  children,
  testID,
}: SheetProps) {
  const { height } = useWindowDimensions();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    slide.setValue(0);
    const animation = Animated.timing(slide, {
      toValue: 1,
      duration: SLIDE_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [visible, slide]);

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [SLIDE_DISTANCE, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityLabel="Fechar"
        onPress={onClose}
        style={[StyleSheet.absoluteFill, styles.backdrop]}
      />
      {/* No Android o Modal já encolhe com o teclado; o ajuste é só no iOS */}
      <KeyboardAvoidingView
        pointerEvents="box-none"
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Animated.View
          style={[
            styles.positioner,
            { maxHeight: height * MAX_HEIGHT, transform: [{ translateY }] },
          ]}
        >
          {/* A margem de baixo soma a barra de gestos do aparelho */}
          <SafeAreaView testID={testID} edges={["bottom"]} style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.eyebrow}>{eyebrow}</Text>
              <Pressable
                testID="sheet-close"
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                hitSlop={8}
                onPress={onClose}
                style={({ pressed }) => [
                  styles.close,
                  pressed && styles.pressed,
                ]}
              >
                <Lucide name="x" size={18} color={theme.colors.text} />
              </Pressable>
            </View>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.content}
            >
              {children}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Presa ao pé da tela: o fundo da folha vai até embaixo da barra de gestos
  positioner: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    backgroundColor: theme.colors.overlay,
  },
  sheet: {
    flexShrink: 1,
    paddingTop: 10,
    paddingHorizontal: theme.spacing.screen,
    backgroundColor: theme.colors.gray,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.gray300,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  eyebrow: {
    fontFamily: theme.font.semiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: theme.colors.muted,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.gray200,
  },
  pressed: {
    opacity: 0.6,
  },
  content: {
    paddingTop: 8,
    paddingBottom: 24,
  },
});
