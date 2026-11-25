import { type ReactNode, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import MemberAvatar from "@/components/member-avatar";
import PressableScale from "@/components/pressable-scale";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import type {
  GroupStatistics,
  RankingItem,
  RankingResponse,
  UserRef,
} from "@/services/types/groups";
import {
  belowPodium,
  bestRecordLabel,
  criterionShortLabels,
  finalResultLabel,
  lastWeekLabel,
  mostConsistentLabel,
  nobodyScored,
  ordinal,
  podiumSlots,
  pointsLabel,
} from "@/utils/group-ranking";
import { HeroTitle, SheetTitle } from "./sheet-parts";

type Slot = "left" | "center" | "right";

// Cor do topo de cada degrau, que desbota até a base escura
const SLOT_COLORS: Record<Slot, string> = {
  left: palette.podiumSilver,
  center: palette.orange,
  right: palette.podiumBronze,
};

// O pódio sobe um degrau de cada vez, do último até o primeiro lugar
const RISE_FIRST_DELAY = 180;
const RISE_STAGGER = 320;
const RISE_DURATION = 520;
const RISE_DISTANCE = 44;
const RISE_EASE = Easing.bezier(0.22, 1, 0.36, 1);

/** Coluna que sobe de baixo, aparecendo, depois de `order` degraus antes dela */
function RiseIn({ order, children }: { order: number; children: ReactNode }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: RISE_DURATION,
      delay: RISE_FIRST_DELAY + order * RISE_STAGGER,
      easing: RISE_EASE,
      useNativeDriver: true,
    }).start();
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

export interface RankingHeroProps {
  ranking: RankingResponse;
  ended: boolean;
  colorOf: (userId: string) => string;
}

/** Parte escura da aba Ranking: pódio, ou o "0" quando ninguém pontuou */
export function RankingHero({ ranking, ended, colorOf }: RankingHeroProps) {
  const empty = nobodyScored(ranking);
  const { left, center, right } = podiumSlots(ranking.items);
  // Ordem de subida: 3º, 2º e 1º; lugar vazio não conta, para não ter pausa
  const present = { left, center, right };
  const rise: Partial<Record<Slot, number>> = {};
  for (const slot of ["right", "left", "center"] as const) {
    if (present[slot]) rise[slot] = Object.keys(rise).length;
  }

  return (
    <View style={styles.hero}>
      <HeroTitle
        title={ended ? "Ranking final" : "Ranking do grupo"}
        subtitle={
          empty
            ? "Cada hábito pode ser o primeiro passo."
            : ended
              ? undefined
              : "Pontuação acumulada do grupo"
        }
      />
      {ended && !empty && (
        <Text style={styles.finalPill}>{finalResultLabel(ranking.as_of)}</Text>
      )}

      {empty ? (
        <View style={styles.empty}>
          <Text style={styles.zero}>0</Text>
          <Text style={styles.emptyTitle}>Ninguém pontuou ainda</Text>
          <Text style={styles.emptyText}>
            O primeiro ponto do grupo começa{"\n"}com um hábito de cada vez.
          </Text>
        </View>
      ) : (
        <View style={styles.podium}>
          <PodiumColumn
            slot="left"
            item={left}
            order={rise.left}
            colorOf={colorOf}
          />
          <PodiumColumn
            slot="center"
            item={center}
            order={rise.center}
            colorOf={colorOf}
          />
          <PodiumColumn
            slot="right"
            item={right}
            order={rise.right}
            colorOf={colorOf}
          />
        </View>
      )}
    </View>
  );
}

function PodiumColumn({
  slot,
  item,
  order = 0,
  colorOf,
}: {
  slot: Slot;
  item?: RankingItem;
  order?: number;
  colorOf: (userId: string) => string;
}) {
  // Grupo com menos de 3 pessoas: o lugar fica vazio, mas o pódio não anda
  if (!item) return <View style={styles.column} />;
  const first = item.position === 1;

  return (
    <RiseIn order={order}>
      <MemberAvatar
        name={item.user.username}
        color={colorOf(item.user.id)}
        size={first ? 68 : 56}
        radius={first ? 22 : 18}
        borderColor={slot === "center" ? palette.orange : palette.headerLabel}
      />
      <Text style={styles.podiumName} numberOfLines={1}>
        {item.user.username}
      </Text>
      <View style={[styles.step, { height: first ? 139 : 101 }]}>
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={`podium-${slot}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={SLOT_COLORS[slot]} />
              <Stop offset="1" stopColor={palette.podiumBase} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#podium-${slot})`} />
        </Svg>
        <Text style={[styles.place, first && styles.placeFirst]}>
          {ordinal(item.position)}
        </Text>
        <Text style={styles.stepPoints}>{pointsLabel(item.score)}</Text>
      </View>
    </RiseIn>
  );
}

export interface RankingSheetProps {
  ranking: RankingResponse;
  stats: GroupStatistics;
  me: UserRef;
  colorOf: (userId: string) => string;
  // Toque numa pessoa: abre os hábitos dela na Visão geral
  onOpenMember: (userId: string) => void;
}

/** Parte clara da aba Ranking: classificação, a sua linha e as estatísticas */
export function RankingSheet({
  ranking,
  stats,
  me,
  colorOf,
  onOpenMember,
}: RankingSheetProps) {
  const empty = nobodyScored(ranking);
  const rest = belowPodium(ranking.items);

  return (
    <View>
      <SheetTitle
        title="Classificação"
        subtitle={criterionShortLabels[ranking.criterion]}
      />

      {empty ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyCardTitle}>
            Criar constância leva um tempo.
          </Text>
          <Text style={styles.emptyCardText}>Os pontos vão aparecer aqui.</Text>
        </View>
      ) : (
        rest.length > 0 && (
          <View style={styles.rows}>
            {rest.map((item) => (
              <RankingRow
                key={item.user.id}
                position={item.position}
                name={item.user.username}
                caption="Pontuação no grupo"
                score={item.score}
                color={colorOf(item.user.id)}
                onPress={() => onOpenMember(item.user.id)}
              />
            ))}
          </View>
        )
      )}

      <Text style={styles.youLabel}>Você no ranking</Text>
      <RankingRow
        highlighted
        // Com todo mundo em 0 a posição não diz nada, então fica de fora
        position={empty ? undefined : ranking.me.position}
        name={`${me.username} · você`}
        caption="Sua pontuação no grupo"
        score={ranking.me.score}
        color={colorOf(me.id)}
        onPress={() => onOpenMember(me.id)}
      />

      <View style={styles.statsTitle}>
        <SheetTitle title="Estatísticas do grupo" />
      </View>
      <View style={styles.stats}>
        <StatCard label="Mais constante" value={mostConsistentLabel(stats)} />
        <StatCard label="Maior recorde" value={bestRecordLabel(stats)} />
        <StatCard
          highlighted
          label="Últimos 7 dias"
          value={lastWeekLabel(stats)}
        />
      </View>
    </View>
  );
}

function RankingRow({
  position,
  name,
  caption,
  score,
  color,
  highlighted = false,
  onPress,
}: {
  position?: number;
  name: string;
  caption: string;
  score: number;
  color: string;
  highlighted?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.row, highlighted && styles.rowHighlighted]}
    >
      <Text style={styles.rowPosition}>
        {position === undefined ? "" : ordinal(position)}
      </Text>
      <MemberAvatar name={name} color={color} size={40} radius={13} />
      <View style={styles.rowTexts}>
        <Text style={styles.rowName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.rowCaption}>{caption}</Text>
      </View>
      <Text style={styles.rowPoints}>{pointsLabel(score)}</Text>
    </PressableScale>
  );
}

function StatCard({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <View style={[styles.stat, highlighted && styles.statHighlighted]}>
      <Text style={[styles.statLabel, highlighted && styles.statLabelOn]}>
        {label}
      </Text>
      <Text style={[styles.statValue, highlighted && styles.statValueOn]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  finalPill: {
    alignSelf: "flex-start",
    marginTop: 9,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: palette.headerRing,
    fontFamily: theme.font.regular,
    fontSize: 11,
    color: palette.cream,
  },
  podium: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  column: {
    width: 110,
    alignItems: "center",
  },
  podiumName: {
    marginTop: 10,
    maxWidth: 100,
    fontFamily: theme.font.medium,
    fontSize: 13,
    color: palette.cream,
  },
  step: {
    marginTop: 34,
    width: 110,
    alignItems: "center",
    paddingTop: 15,
    gap: 8,
    overflow: "hidden",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  place: {
    fontFamily: theme.font.medium,
    fontSize: 36,
    color: palette.cream,
  },
  placeFirst: {
    fontSize: 42,
  },
  stepPoints: {
    fontFamily: theme.font.medium,
    fontSize: 12,
    color: palette.cream,
  },
  empty: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 46,
  },
  zero: {
    fontFamily: theme.font.regular,
    fontSize: 80,
    color: palette.orange,
  },
  emptyTitle: {
    marginTop: 10,
    fontFamily: theme.font.regular,
    fontSize: 24,
    color: palette.cream,
  },
  emptyText: {
    marginTop: 16,
    fontFamily: theme.font.regular,
    fontSize: 13,
    lineHeight: 19.5,
    color: palette.headerLabel,
    textAlign: "center",
  },
  rows: {
    marginTop: 17,
    gap: 8,
  },
  row: {
    height: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    backgroundColor: palette.card,
    borderWidth: 0.7,
    borderColor: palette.line,
    borderRadius: 18,
  },
  rowHighlighted: {
    backgroundColor: palette.sageSoft,
    borderColor: palette.sageLine,
  },
  rowPosition: {
    width: 20,
    fontFamily: theme.font.medium,
    fontSize: 12,
    color: palette.inkSoft,
  },
  rowTexts: {
    flex: 1,
    gap: 5,
  },
  rowName: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: palette.ink,
  },
  rowCaption: {
    fontFamily: theme.font.regular,
    fontSize: 11,
    color: palette.inkSoft,
  },
  rowPoints: {
    fontFamily: theme.font.medium,
    fontSize: 15,
    color: palette.ink,
  },
  emptyCard: {
    marginTop: 17,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: palette.pill,
    borderRadius: 18,
  },
  emptyCardTitle: {
    fontFamily: theme.font.medium,
    fontSize: 13,
    color: palette.ink,
  },
  emptyCardText: {
    fontFamily: theme.font.regular,
    fontSize: 11,
    color: palette.inkSoft,
  },
  youLabel: {
    marginTop: 24,
    marginBottom: 8,
    fontFamily: theme.font.medium,
    fontSize: 13,
    color: palette.ink,
  },
  statsTitle: {
    marginTop: 34,
  },
  stats: {
    marginTop: 14,
    gap: 12,
  },
  stat: {
    minHeight: 90,
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: palette.card,
    borderWidth: 0.7,
    borderColor: palette.line,
    borderRadius: 20,
  },
  statHighlighted: {
    minHeight: 84,
    backgroundColor: palette.orange,
    borderColor: palette.orange,
  },
  statLabel: {
    fontFamily: theme.font.medium,
    fontSize: 11,
    color: palette.inkSoft,
  },
  statLabelOn: {
    color: palette.ink,
  },
  statValue: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    lineHeight: 21,
    color: palette.ink,
  },
  statValueOn: {
    fontSize: 17,
    lineHeight: 25.5,
  },
});
