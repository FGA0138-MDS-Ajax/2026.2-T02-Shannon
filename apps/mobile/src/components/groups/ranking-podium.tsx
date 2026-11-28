import { type ReactNode, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Avatar } from "@/components/ui";
import { theme } from "@/config/theme";
import type {
  RankingCriterion,
  RankingItem,
  RankingMe,
} from "@/services/types/groups";
import { formatScore, podiumSlots } from "@/utils/group-ranking";

type Slot = "left" | "center" | "right";

const SLOTS: Slot[] = ["left", "center", "right"];
// Ordem de subida: 3º, 2º e 1º
const RISE_ORDER: Slot[] = ["right", "left", "center"];
const RISE_DELAY = 150;
const RISE_STAGGER = 250;
const RISE_DURATION = 450;
const RISE_DISTANCE = 36;
// A altura do degrau vem da posição da API: empatados ficam da mesma altura
const STEP_HEIGHTS = [120, 96, 76];

export interface RankingPodiumProps {
  items: RankingItem[];
  criterion: RankingCriterion;
  colorOf: (userId: string) => string;
  /** Destaque do usuário atual, vindo da API (`me`); não calculado por id */
  me?: RankingMe;
  /** @deprecated Use `me`. Mantido só para compatibilidade */
  userId?: string;
  onOpenMember: (userId: string) => void;
}

/**
 * Os três primeiros do ranking, sobre o cabeçalho escuro, com o 1º da lista no meio, subindo um de cada
 * vez. Tocar numa pessoa mostra os hábitos dela.
 */
export default function RankingPodium({
  items,
  criterion,
  colorOf,
  me,
  userId,
  onOpenMember,
}: RankingPodiumProps) {
  const slots = podiumSlots(items);
  // Lugar vazio não entra na fila, para não haver pausa na subida
  const order = new Map(
    RISE_ORDER.filter((slot) => slots[slot]).map((slot, index) => [
      slot,
      index,
    ]),
  );

  return (
    <View style={styles.podium}>
      {SLOTS.map((slot) => {
        const item = slots[slot];
        // Grupo com menos de 3 pessoas: o lugar fica vazio, o pódio não anda
        if (!item) return <View key={slot} style={styles.column} />;
        const first = item.position === 1;
        const isMe = me
          ? item.position === me.position && item.score === me.score
          : !!userId && item.user.id === userId;
        const name = isMe ? "Você" : item.user.username;
        return (
          <RiseIn key={slot} order={order.get(slot) ?? 0}>
            <Pressable
              testID={`podium-${item.position}-${item.user.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${item.position}º, ${name}`}
              onPress={() => onOpenMember(item.user.id)}
              style={styles.member}
            >
              <Avatar
                name={item.user.username}
                color={colorOf(item.user.id)}
                // Empatados em 1º ficam do mesmo tamanho
                size={first ? 60 : 48}
                highlighted={isMe}
              />
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              <View
                style={[
                  styles.step,
                  first && styles.stepFirst,
                  {
                    height: STEP_HEIGHTS[Math.min(item.position, 3) - 1],
                  },
                ]}
              >
                <Text style={[styles.place, first && styles.textFirst]}>
                  {item.position}º
                </Text>
                <Text style={[styles.score, first && styles.textFirst]}>
                  {formatScore(item.score, criterion)}
                </Text>
              </View>
            </Pressable>
          </RiseIn>
        );
      })}
    </View>
  );
}

/** Coluna que sobe de baixo, depois de `order` colunas antes dela */
function RiseIn({ order, children }: { order: number; children: ReactNode }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: RISE_DURATION,
      delay: RISE_DELAY + order * RISE_STAGGER,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [order, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [RISE_DISTANCE, 0],
  });

  return (
    <Animated.View
      style={[
        styles.column,
        { opacity: progress, transform: [{ translateY }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  podium: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
  },
  column: {
    flex: 1,
    alignItems: "center",
  },
  member: {
    alignSelf: "stretch",
    alignItems: "center",
  },
  name: {
    marginTop: 8,
    maxWidth: "100%",
    fontFamily: theme.font.semiBold,
    fontSize: 13,
    color: theme.colors.onHero,
  },
  step: {
    marginTop: 10,
    alignSelf: "stretch",
    alignItems: "center",
    paddingTop: 12,
    gap: 4,
    borderTopLeftRadius: theme.radius.md,
    borderTopRightRadius: theme.radius.md,
    backgroundColor: theme.colors.heroRaised,
  },
  stepFirst: {
    backgroundColor: theme.colors.heroBorder,
  },
  place: {
    fontFamily: theme.font.bold,
    fontSize: 26,
    color: theme.colors.onHero,
  },
  score: {
    fontFamily: theme.font.medium,
    fontSize: 12,
    color: theme.colors.onHeroMuted,
  },
  textFirst: {
    color: theme.colors.primary,
  },
});
