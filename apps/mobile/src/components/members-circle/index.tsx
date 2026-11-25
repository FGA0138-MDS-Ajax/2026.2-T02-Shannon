import { type ComponentRef, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import {
  type GroupToday,
  groupTodayLabel,
  type MemberToday,
  memberRatio,
} from "@/utils/group-circle";
import { angleAround, angleDelta, sliceAngles, slicePath } from "./geometry";

// Cores do Figma: as 4 primeiras são as do grupo de 4 pessoas, as outras
// vêm do círculo de 30 pessoas
const MEMBER_COLORS = [
  "#F16532",
  "#D9AD6C",
  "#8FA77B",
  "#A998BB",
  "#7DAEAA",
  "#8C9FC0",
  "#D5836C",
  "#D6BE81",
  "#A3B476",
  "#E98243",
];
const TRACK = "#34382C";

// Caixa da roda na tela (SIZE) e área de desenho, um pouco maior (DRAW)
const SIZE = 256;
const BLEED = 8;
const DRAW = SIZE + BLEED * 2;
const CENTER = DRAW / 2;
const OUTER = 126;
const INNER = 48;
const CORNER = 12;

// Escolher uma pessoa: a fatia dela vai um pouco para a frente (para fora do
// centro) e as outras escurecem. Tudo anima no nativo, sem travar.
const SELECT_DURATION = 220;
const SMOOTH = Easing.out(Easing.cubic);
const LIFT = 6; // px que a fatia escolhida anda para fora
const SELECTED_STROKE = 2.5;
// Camada escura por cima das outras fatias: 0.6 de tinta = fatia com 40%
const DIM_OVERLAY = 0.6;

// Giro livre: o dedo arrasta a roda e, ao soltar, ela segue no embalo
const MOVE_THRESHOLD = 4; // px até virar arraste (antes disso é toque na fatia)
const DECELERATION = 0.996; // mais perto de 1 = gira por mais tempo
const MAX_SPEED = 3; // graus por milissegundo
const MIN_SPEED = 0.02;
const STILL_BEFORE_RELEASE = 80; // ms parado antes de soltar = sem embalo

export interface MembersCircleProps {
  members: MemberToday[];
  group: GroupToday;
  selectedId: string | null;
  // `null` volta para todos
  onSelect: (userId: string | null) => void;
  // Avisa assim que o dedo encosta e solta, para a tela travar a rolagem
  // antes de o arraste começar
  onTouchingChange?: (touching: boolean) => void;
}

/** Círculo de participantes: uma fatia por pessoa, preenchida pelo que ela já fez hoje */
export default function MembersCircle({
  members,
  group,
  selectedId,
  onSelect,
  onTouchingChange,
}: MembersCircleProps) {
  const selected = members.find((member) => member.user.id === selectedId);
  const thin = members.length > 12;

  const wheelRef = useRef<ComponentRef<typeof View>>(null);
  const rotation = useRef(new Animated.Value(0)).current;
  // Ângulo atual da roda, também durante o embalo. Guardado aqui porque
  // perguntar ao nativo no meio da animação nem sempre responde.
  const current = useRef(0);
  // Estado do arraste. Fica num ref porque muda a cada movimento do dedo e
  // não deve redesenhar a tela.
  const drag = useRef({
    center: null as { x: number; y: number } | null,
    base: 0,
    angle: 0,
    turned: 0,
    time: 0,
    speed: 0,
  });

  useEffect(() => {
    const id = rotation.addListener(({ value }) => {
      current.current = value;
    });
    return () => rotation.removeListener(id);
  }, [rotation]);

  // Centro da roda na tela. Medido com a tela no topo; como a roda fica
  // parada atrás da lista, ele não muda quando a lista rola.
  const measureCenter = () => {
    wheelRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      if (width > 0) {
        drag.current.center = { x: pageX + width / 2, y: pageY + height / 2 };
      }
    });
  };

  const pan = useMemo(() => {
    const release = () => {
      const state = drag.current;
      if (Date.now() - state.time > STILL_BEFORE_RELEASE) return;
      const speed = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, state.speed));
      if (Math.abs(speed) < MIN_SPEED) return;
      Animated.decay(rotation, {
        velocity: speed,
        deceleration: DECELERATION,
        useNativeDriver: true,
      }).start();
    };

    return PanResponder.create({
      // "Capture": a roda pega o arraste antes das fatias; toque parado
      // continua indo para a fatia
      onMoveShouldSetPanResponderCapture: (_, { dx, dy }) =>
        Math.abs(dx) + Math.abs(dy) > MOVE_THRESHOLD,
      onPanResponderGrant: (_, { moveX, moveY }) => {
        const state = drag.current;
        // Para o embalo anterior e continua do ângulo em que a roda está
        rotation.stopAnimation();
        state.base = current.current;
        state.turned = 0;
        state.speed = 0;
        state.time = Date.now();
        if (state.center) {
          state.angle = angleAround(state.center, { x: moveX, y: moveY });
        }
      },
      onPanResponderMove: (_, { moveX, moveY }) => {
        const state = drag.current;
        if (!state.center) return;
        const angle = angleAround(state.center, { x: moveX, y: moveY });
        const delta = angleDelta(state.angle, angle);
        const now = Date.now();
        const elapsed = Math.max(now - state.time, 1);
        // Média com o valor anterior para o embalo não pular
        state.speed = 0.8 * (delta / elapsed) + 0.2 * state.speed;
        state.angle = angle;
        state.time = now;
        state.turned += delta;
        rotation.setValue(state.base + state.turned);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: release,
      onPanResponderTerminate: release,
    });
  }, [rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
    extrapolate: "extend",
  });

  // Dois valores por fatia, ambos animados no nativo:
  // `dim` = camada escura por cima (0 nada, 0.6 apagada, 1 esconde a original)
  // `lift` = cópia da fatia andando para a frente (0 parada, 1 na frente)
  const layers = useMemo(
    () =>
      new Map(
        members.map((member) => [
          member.user.id,
          { dim: new Animated.Value(0), lift: new Animated.Value(0) },
        ]),
      ),
    [members],
  );
  // 0 = mostrando o grupo (67%), 1 = mostrando uma pessoa
  const selection = useRef(new Animated.Value(0)).current;
  // Nome no centro: continua o último durante o esmaecimento de volta
  const [shownName, setShownName] = useState(selected?.user.username ?? "");
  const selectedName = selected?.user.username;

  useEffect(() => {
    if (selectedName) setShownName(selectedName);
  }, [selectedName]);

  useEffect(() => {
    const to = (value: Animated.Value, toValue: number) =>
      Animated.timing(value, {
        toValue,
        duration: SELECT_DURATION,
        easing: SMOOTH,
        useNativeDriver: true,
      });
    Animated.parallel([
      to(selection, selectedId ? 1 : 0),
      ...members.flatMap((member) => {
        const layer = layers.get(member.user.id);
        if (!layer) return [];
        const isSelected = member.user.id === selectedId;
        return [
          to(layer.dim, !selectedId ? 0 : isSelected ? 1 : DIM_OVERLAY),
          to(layer.lift, isSelected ? 1 : 0),
        ];
      }),
    ]).start();
  }, [selectedId, members, layers, selection]);

  const slices = members.map((member, index) => {
    const { start, end } = sliceAngles(index, members.length);
    const shape = { cx: CENTER, cy: CENTER, inner: INNER, start, end };
    const ratio = memberRatio(member);
    // Direção "para fora": o meio da fatia
    const middle = (((start + end) / 2) * Math.PI) / 180;
    const layer = layers.get(member.user.id) ?? {
      dim: new Animated.Value(0),
      lift: new Animated.Value(0),
    };
    return {
      member,
      color: MEMBER_COLORS[index % MEMBER_COLORS.length],
      track: slicePath({ ...shape, outer: OUTER, corner: CORNER }),
      fill:
        ratio > 0
          ? slicePath({
              ...shape,
              outer: INNER + (OUTER - INNER) * ratio,
              corner: CORNER,
            })
          : null,
      layer,
      liftX: layer.lift.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Math.sin(middle) * LIFT],
      }),
      liftY: layer.lift.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -Math.cos(middle) * LIFT],
      }),
    };
  });

  return (
    <View style={styles.container}>
      <View
        ref={wheelRef}
        style={styles.wheel}
        onLayout={measureCenter}
        onTouchStart={() => onTouchingChange?.(true)}
        onTouchEnd={() => onTouchingChange?.(false)}
        onTouchCancel={() => onTouchingChange?.(false)}
        {...pan.panHandlers}
      >
        <Animated.View style={[styles.drawing, { transform: [{ rotate }] }]}>
          {/* Fatias de verdade: só elas recebem o toque */}
          <Svg width={DRAW} height={DRAW}>
            {slices.map(({ member, color, track, fill }) => (
              <G
                key={member.user.id}
                onPress={() =>
                  onSelect(
                    member.user.id === selectedId ? null : member.user.id,
                  )
                }
                accessibilityLabel={`${member.user.username}, ${member.done} de ${member.total} hábitos`}
              >
                <Path
                  d={track}
                  fill={TRACK}
                  stroke={color}
                  strokeWidth={thin ? 0.6 : 1}
                />
                {fill && <Path d={fill} fill={color} />}
              </G>
            ))}
          </Svg>

          {/* Camadas só de visual (sem toque), uma por pessoa, para a fatia
              anterior voltar enquanto a nova vai para a frente */}
          {slices.map(({ member, track, layer }) => (
            <Animated.View
              key={`dim-${member.user.id}`}
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { opacity: layer.dim }]}
            >
              <Svg width={DRAW} height={DRAW}>
                <Path
                  d={track}
                  fill={palette.ink}
                  stroke={palette.ink}
                  strokeWidth={SELECTED_STROKE + 1}
                />
              </Svg>
            </Animated.View>
          ))}
          {slices.map(({ member, color, track, fill, layer, liftX, liftY }) => (
            <Animated.View
              key={`lift-${member.user.id}`}
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  opacity: layer.lift,
                  transform: [{ translateX: liftX }, { translateY: liftY }],
                },
              ]}
            >
              <Svg width={DRAW} height={DRAW}>
                <Path
                  d={track}
                  fill={TRACK}
                  stroke={color}
                  strokeWidth={SELECTED_STROKE}
                />
                {fill && <Path d={fill} fill={color} />}
              </Svg>
            </Animated.View>
          ))}
        </Animated.View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={selected ? "Ver todos" : undefined}
          disabled={!selected}
          onPress={() => onSelect(null)}
          style={styles.center}
        >
          <Animated.Text
            style={[
              styles.percent,
              {
                opacity: selection.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
              },
            ]}
          >
            {group.percent}%
          </Animated.Text>
          <Animated.Text
            numberOfLines={1}
            style={[styles.name, { opacity: selection }]}
          >
            {shownName}
          </Animated.Text>
        </Pressable>
      </View>

      {/* Com uma pessoa escolhida a legenda some, mas o espaço continua */}
      <Animated.Text
        style={[
          styles.caption,
          {
            opacity: selection.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
          },
        ]}
      >
        {groupTodayLabel(group)}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // A folga em cima é a mesma do desenho: a fatia que vai para a frente não
  // é cortada pela borda da lista
  container: {
    alignItems: "center",
    paddingTop: BLEED,
    paddingBottom: 14,
  },
  wheel: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  // O desenho passa um pouco da caixa da roda para a fatia escolhida ir
  // para a frente sem ser cortada
  drawing: {
    position: "absolute",
    top: -BLEED,
    left: -BLEED,
    width: DRAW,
    height: DRAW,
  },
  center: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  percent: {
    position: "absolute",
    fontFamily: theme.font.regular,
    fontSize: 28,
    color: palette.cream,
  },
  name: {
    position: "absolute",
    maxWidth: 84,
    fontFamily: theme.font.medium,
    fontSize: 19,
    color: palette.cream,
  },
  caption: {
    marginTop: 12,
    fontFamily: theme.font.regular,
    fontSize: 11,
    color: palette.headerLabel,
  },
});
