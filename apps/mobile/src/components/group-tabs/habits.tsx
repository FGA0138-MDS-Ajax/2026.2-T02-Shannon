import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { palette } from "@/components/statistics/palette";
import { theme } from "@/config/theme";
import {
  type GroupToday,
  goalsForTodayLabel,
  type HabitToday,
} from "@/utils/group-circle";
import { HeroTitle, ManageLink, SheetTitle } from "./sheet-parts";

const FILL_DURATION = 700;

export interface HabitsHeroProps {
  group: GroupToday;
}

/** Parte escura da aba Hábitos: quantas metas o grupo já bateu hoje */
export function HabitsHero({ group }: HabitsHeroProps) {
  // A barra enche do zero até o valor de hoje ao abrir a aba
  const fill = useRef(new Animated.Value(0)).current;
  const ratio = group.total === 0 ? 0 : group.done / group.total;

  useEffect(() => {
    Animated.timing(fill, {
      toValue: ratio,
      duration: FILL_DURATION,
      easing: Easing.out(Easing.cubic),
      // Largura em porcentagem não anima no nativo; é uma view só
      useNativeDriver: false,
    }).start();
  }, [fill, ratio]);

  return (
    <View style={styles.hero}>
      <HeroTitle
        title="Hábitos do grupo"
        subtitle={goalsForTodayLabel(group)}
      />
      <View style={styles.today}>
        <Text style={styles.todayLabel}>Hoje, juntos</Text>
        <Text style={styles.todayNumber}>
          {group.done} de {group.total}
        </Text>
        <Text style={styles.todayHint}>metas concluídas</Text>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.trackFill,
              {
                width: fill.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
      </View>
      <Text style={styles.motto}>Um check-in de cada vez.</Text>
    </View>
  );
}

export interface HabitsSheetProps {
  habits: HabitToday[];
  // "3 hábitos · Todo dia"
  summary: string;
  descriptionOf: (habitId: string) => string | null;
  // Abre a lista de hábitos de antes (criar, editar e encerrar)
  onManage: () => void;
}

/** Parte clara da aba Hábitos: cada hábito com quantas pessoas já fizeram */
export function HabitsSheet({
  habits,
  summary,
  descriptionOf,
  onManage,
}: HabitsSheetProps) {
  return (
    <View>
      <SheetTitle title="Todos os hábitos" subtitle={summary} />
      <View style={styles.rows}>
        {habits.map((habit) => {
          const allDone = habit.total > 0 && habit.done === habit.total;
          const description = descriptionOf(habit.habitId);
          return (
            <View key={habit.habitId} style={styles.row}>
              <View style={styles.rowTexts}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {habit.name}
                </Text>
                {description && (
                  <Text style={styles.rowDescription} numberOfLines={1}>
                    {description}
                  </Text>
                )}
              </View>
              <Text style={[styles.count, allDone && styles.countDone]}>
                {habit.done}/{habit.total}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.note}>
        O número mostra quantas pessoas concluíram a meta.
      </Text>
      <ManageLink label="Gerenciar hábitos" onPress={onManage} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 30,
  },
  today: {
    marginTop: 40,
    padding: 18,
    borderRadius: 24,
    backgroundColor: palette.orange,
  },
  todayLabel: {
    fontFamily: theme.font.medium,
    fontSize: 12,
    color: palette.ink,
  },
  todayNumber: {
    marginTop: 12,
    fontFamily: theme.font.regular,
    fontSize: 46,
    color: palette.ink,
  },
  todayHint: {
    marginTop: 2,
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: palette.ink,
  },
  track: {
    marginTop: 26,
    height: 7,
    borderRadius: 3.5,
    overflow: "hidden",
    backgroundColor: palette.progressTrack,
  },
  trackFill: {
    height: 7,
    borderRadius: 3.5,
    backgroundColor: palette.ink,
  },
  motto: {
    marginTop: 24,
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: palette.headerLabel,
  },
  rows: {
    marginTop: 17,
    gap: 8,
  },
  row: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: palette.card,
    borderWidth: 0.7,
    borderColor: palette.line,
    borderRadius: 18,
  },
  rowTexts: {
    flex: 1,
    gap: 6,
  },
  rowName: {
    fontFamily: theme.font.medium,
    fontSize: 15,
    color: palette.ink,
  },
  rowDescription: {
    fontFamily: theme.font.regular,
    fontSize: 11,
    color: palette.inkSoft,
  },
  count: {
    minWidth: 50,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 13,
    overflow: "hidden",
    textAlign: "center",
    backgroundColor: palette.pill,
    fontFamily: theme.font.medium,
    fontSize: 12,
    color: palette.ink,
  },
  countDone: {
    backgroundColor: palette.sageSoft,
  },
  note: {
    marginTop: 24,
    fontFamily: theme.font.regular,
    fontSize: 10,
    color: palette.inkSoft,
  },
});
