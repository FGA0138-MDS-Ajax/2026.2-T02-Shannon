import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { theme } from "@/config/theme";
import {
  type GroupPeriod,
  groupPeriodLabel,
  type MemberPeriod,
  memberPeriodLabel,
  memberRatio,
} from "@/utils/group-period";
import { ringPath, sliceAngles, slicePath } from "./geometry";

const SIZE = 248;
// Folga em volta do desenho para a fatia escolhida andar para fora sem cortar
const BLEED = 8;
const DRAW = SIZE + BLEED * 2;
const CENTER = DRAW / 2;
const OUTER = SIZE / 2 - 2;
const INNER = 46;
const CORNER = 12;
const LIFT = 6;
const DIMMED_OPACITY = 0.3;
// Ao aparecer, a roda gira um pouco e cresce até o lugar
const ENTER_DURATION = 700;
const ENTER_TURN = "-40deg";
const ENTER_SCALE = 0.85;

export interface MembersCircleProps {
  members: MemberPeriod[];
  group: GroupPeriod;
  colorOf: (userId: string) => string;
  /** Quem está usando o app aparece como "Você" */
  userId?: string;
  selectedId: string | null;
  /** `null` volta para o grupo todo */
  onSelect: (userId: string | null) => void;
}

/**
 * Roda de participantes, sobre o cabeçalho escuro: uma fatia por integrante, preenchida de dentro para
 * fora pela parte das metas que ele já cumpriu. Tocar numa fatia mostra os
 * hábitos da pessoa; tocar de novo (ou no centro) volta para todos.
 */
export default function MembersCircle({
  members,
  group,
  colorOf,
  userId,
  selectedId,
  onSelect,
}: MembersCircleProps) {
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: ENTER_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [enter]);

  const nameOf = (member: MemberPeriod) =>
    member.user.id === userId ? "Você" : member.user.username;
  const selected = members.find((member) => member.user.id === selectedId);
  // Uma pessoa só: anel fechado, porque uma fatia de 360° viraria um "C"
  const alone = members.length === 1;

  const slices = members.map((member, index) => {
    const { start, end } = sliceAngles(index, members.length);
    const path = (outer: number) =>
      alone
        ? ringPath({ cx: CENTER, cy: CENTER, inner: INNER, outer })
        : slicePath({
            cx: CENTER,
            cy: CENTER,
            inner: INNER,
            outer,
            start,
            end,
            corner: CORNER,
          });
    const ratio = memberRatio(member);
    // Direção "para fora": o meio da fatia
    const middle = (((start + end) / 2) * Math.PI) / 180;
    const isSelected = member.user.id === selectedId;
    const lift = isSelected && !alone ? LIFT : 0;
    return {
      member,
      color: colorOf(member.user.id),
      track: path(OUTER),
      fill: ratio > 0 ? path(INNER + (OUTER - INNER) * ratio) : null,
      isSelected,
      dimmed: !!selectedId && !isSelected,
      dx: Math.sin(middle) * lift,
      dy: -Math.cos(middle) * lift,
    };
  });

  return (
    <View testID="members-circle" style={styles.container}>
      <View style={styles.wheel}>
        <Animated.View
          style={[
            styles.drawing,
            {
              opacity: enter,
              transform: [
                {
                  rotate: enter.interpolate({
                    inputRange: [0, 1],
                    outputRange: [ENTER_TURN, "0deg"],
                  }),
                },
                {
                  scale: enter.interpolate({
                    inputRange: [0, 1],
                    outputRange: [ENTER_SCALE, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Svg width={DRAW} height={DRAW}>
            {slices.map(
              ({ member, color, track, fill, isSelected, dimmed, dx, dy }) => (
                <G
                  key={member.user.id}
                  testID={`circle-slice-${member.user.id}`}
                  opacity={dimmed ? DIMMED_OPACITY : 1}
                  transform={`translate(${dx} ${dy})`}
                  onPress={() => onSelect(isSelected ? null : member.user.id)}
                  accessibilityLabel={`${member.user.username}, ${member.done} de ${member.total} metas`}
                >
                  <Path
                    d={track}
                    fill={theme.colors.heroRaised}
                    stroke={color}
                    strokeWidth={isSelected ? 2.5 : 1}
                  />
                  {fill && <Path d={fill} fill={color} />}
                </G>
              ),
            )}
          </Svg>
        </Animated.View>

        <Pressable
          testID="circle-center"
          accessibilityRole="button"
          accessibilityLabel={selected ? "Ver todos" : undefined}
          disabled={!selected}
          onPress={() => onSelect(null)}
          style={styles.center}
        >
          {selected ? (
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              style={styles.name}
            >
              {nameOf(selected)}
            </Text>
          ) : (
            <Text style={styles.percent}>{group.percent}%</Text>
          )}
        </Pressable>
      </View>

      <Text style={styles.caption}>
        {selected ? memberPeriodLabel(selected) : groupPeriodLabel(group)}
      </Text>

      {/* Legenda: quem é cada cor. Tocar no nome faz o mesmo que na fatia */}
      <View style={styles.legend}>
        {members.map((member) => {
          const isSelected = member.user.id === selectedId;
          return (
            <Pressable
              key={member.user.id}
              testID={`circle-legend-${member.user.id}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              hitSlop={10}
              onPress={() => onSelect(isSelected ? null : member.user.id)}
              style={[styles.legendItem, isSelected && styles.legendSelected]}
            >
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: colorOf(member.user.id) },
                ]}
              />
              <Text style={styles.legendName} numberOfLines={1}>
                {nameOf(member)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: BLEED,
  },
  wheel: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  drawing: {
    position: "absolute",
    top: -BLEED,
    left: -BLEED,
  },
  center: {
    width: INNER * 2 - 8,
    height: INNER * 2 - 8,
    borderRadius: INNER,
    alignItems: "center",
    justifyContent: "center",
  },
  percent: {
    fontFamily: theme.font.regular,
    fontSize: 28,
    color: theme.colors.onHero,
  },
  // Largura fixa: o `adjustsFontSizeToFit` precisa dela para saber o limite
  name: {
    width: INNER * 2 - 14,
    textAlign: "center",
    fontFamily: theme.font.bold,
    fontSize: 17,
    color: theme.colors.onHero,
  },
  legend: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
  },
  legendSelected: {
    backgroundColor: theme.colors.heroRaised,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: theme.radius.pill,
  },
  legendName: {
    maxWidth: 120,
    fontFamily: theme.font.medium,
    fontSize: 13,
    color: theme.colors.onHero,
  },
  caption: {
    marginTop: 14,
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.colors.onHeroMuted,
  },
});
