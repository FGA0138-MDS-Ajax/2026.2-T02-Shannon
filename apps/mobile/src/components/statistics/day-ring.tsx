import { Lucide } from "@react-native-vector-icons/lucide";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { theme } from "@/config/theme";
import { palette } from "./palette";

export interface DayRingProps {
  day: number;
  done: number;
  total: number;
  size: number;
  isToday: boolean;
  isFuture: boolean;
}

const STROKE = 3;

// Bolinha de um dia da semana. Todos os hábitos feitos: preenchida com check.
// Faltando algum: anel laranja proporcional ao que já foi feito.
export default function DayRing({
  day,
  done,
  total,
  size,
  isToday,
  isFuture,
}: DayRingProps) {
  const isComplete = !isFuture && total > 0 && done >= total;
  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = total > 0 ? Math.min(done / total, 1) : 0;
  const label = isComplete
    ? `${day}, completo`
    : `${day}, ${done} de ${total} hábitos`;

  if (isComplete) {
    return (
      <View
        testID={`day-ring-${day}-complete`}
        accessibilityLabel={label}
        style={[
          styles.complete,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Lucide name="check" size={size * 0.5} color={palette.cream} />
      </View>
    );
  }

  return (
    <View
      testID={`day-ring-${day}`}
      accessibilityLabel={isFuture ? `${day}` : label}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isToday ? palette.cream : palette.headerRing}
          strokeOpacity={isFuture ? 0.5 : 1}
          strokeWidth={STROKE}
          fill="none"
        />
        {!isFuture && ratio > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={palette.primary}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference * ratio} ${circumference}`}
            // O arco começa no topo (12h) e anda no sentido do relógio
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <View style={styles.center}>
        <Text
          style={[
            styles.number,
            isFuture && styles.numberFuture,
            isToday && styles.numberToday,
          ]}
        >
          {day}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  complete: {
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  number: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: palette.cream,
  },
  numberFuture: {
    color: palette.headerMuted,
  },
  numberToday: {
    fontFamily: theme.font.bold,
  },
});
