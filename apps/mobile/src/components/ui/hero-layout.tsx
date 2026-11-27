import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  type ComponentRef,
  type ReactNode,
  type Ref,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, RefreshControl, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { theme } from "@/config/theme";
import { BackButton, HeaderAction } from "./screen";

// Rolando até a folha cobrir o cabeçalho, ele esmaece e encolhe um pouco
// (sem sumir de todo), como se ficasse para trás
const FADE_DISTANCE = 260;
const MIN_OPACITY = 0.3;
const MIN_SCALE = 0.94;
const EDGE_FADE = 16;

export type HeroScrollRef = ComponentRef<typeof Animated.ScrollView>;

export interface HeroLayoutProps {
  /** Linha fixa no topo, sobre o escuro (ex.: voltar e o nome do grupo) */
  header?: ReactNode;
  /** Parte escura que fica parada atrás da folha */
  hero: ReactNode;
  /** Conteúdo da folha clara */
  children: ReactNode;
  /** Sem barra de abas embaixo, a folha soma a barra de gestos */
  bottomInset?: boolean;
  /** Espaço livre no fim da folha (ex.: para não ficar atrás de um botão flutuante) */
  bottomSpace?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  scrollRef?: Ref<HeroScrollRef>;
  testID?: string;
}

/**
 * Tela com cabeçalho escuro e uma folha clara de cantos arredondados que sobe
 * por cima dele ao rolar. Enquanto a tela está na frente, a barra de status
 * fica clara.
 */
export function HeroLayout({
  header,
  hero,
  children,
  bottomInset = false,
  bottomSpace = 32,
  refreshing = false,
  onRefresh,
  scrollRef,
  testID,
}: HeroLayoutProps) {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const handleScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY],
  );

  // A barra de status clara só existe com a tela na frente: ao sair, a da
  // tela seguinte assume (as abas continuam montadas por trás)
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  // O cabeçalho desce o mesmo tanto que a lista sobe: fica parado e a folha
  // passa por cima. Puxando para baixo no topo, ele vai junto.
  const translateY = scrollY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolateLeft: "clamp",
  });
  const opacity = scrollY.interpolate({
    inputRange: [0, FADE_DISTANCE],
    outputRange: [1, MIN_OPACITY],
    extrapolate: "clamp",
  });
  // O degradê do topo só aparece depois que a folha começa a subir; parado,
  // ele apagaria a linha de cima do cabeçalho
  const edgeOpacity = scrollY.interpolate({
    inputRange: [0, EDGE_FADE],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const scale = scrollY.interpolate({
    inputRange: [0, FADE_DISTANCE],
    outputRange: [1, MIN_SCALE],
    extrapolate: "clamp",
  });

  return (
    <SafeAreaView testID={testID} edges={["top"]} style={styles.container}>
      {focused && <StatusBar style="light" />}
      {header && <View style={styles.column}>{header}</View>}
      <View style={styles.viewport}>
        <Animated.ScrollView
          ref={scrollRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.onHero}
                progressBackgroundColor={theme.colors.surface}
              />
            ) : undefined
          }
        >
          <Animated.View
            style={{ opacity, transform: [{ translateY }, { scale }] }}
          >
            {hero}
          </Animated.View>
          <View
            style={[
              styles.sheet,
              {
                paddingBottom: bottomSpace + (bottomInset ? insets.bottom : 0),
              },
            ]}
          >
            {children}
          </View>
        </Animated.ScrollView>
        {/* A folha some aos poucos sob o topo escuro, sem corte seco */}
        <Animated.View
          pointerEvents="none"
          style={[styles.edgeFade, { opacity: edgeOpacity }]}
        >
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="hero-edge" x1="0" y1="0" x2="0" y2="1">
                <Stop
                  offset="0"
                  stopColor={theme.colors.hero}
                  stopOpacity={1}
                />
                <Stop
                  offset="1"
                  stopColor={theme.colors.hero}
                  stopOpacity={0}
                />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#hero-edge)" />
          </Svg>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

export interface HeroTopBarProps {
  title?: string;
  /** Ação de texto à direita (ex.: "Editar") */
  actionLabel?: string;
  onAction?: () => void;
  actionTestID?: string;
}

/** Linha do topo sobre o cabeçalho escuro: voltar, título e uma ação */
export function HeroTopBar({
  title,
  actionLabel,
  onAction,
  actionTestID,
}: HeroTopBarProps) {
  return (
    <View style={styles.topBar}>
      <BackButton onHero />
      <Text style={styles.topBarTitle} numberOfLines={1}>
        {title}
      </Text>
      {actionLabel && onAction && (
        <HeaderAction
          onHero
          testID={actionTestID}
          label={actionLabel}
          onPress={onAction}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
    paddingBottom: 12,
    paddingLeft: 16,
    paddingRight: theme.spacing.screen,
  },
  topBarTitle: {
    flex: 1,
    fontFamily: theme.font.bold,
    fontSize: 24,
    color: theme.colors.onHero,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.hero,
  },
  viewport: {
    flex: 1,
  },
  edgeFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: EDGE_FADE,
  },
  // Em telas largas a folha vira uma coluna centralizada sobre o fundo escuro
  column: {
    width: "100%",
    maxWidth: theme.layout.content,
    alignSelf: "center",
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: theme.layout.content,
    alignSelf: "center",
  },
  sheet: {
    flexGrow: 1,
    paddingTop: 20,
    paddingHorizontal: theme.spacing.screen,
    backgroundColor: theme.colors.gray,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
  },
});
