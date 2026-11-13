import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/config/theme";
import type { HabitCategory } from "@/services/types/habits";
import type { UserStatistics } from "@/services/types/statistics";
import type { HabitHistoryDay, WeekDayProgress } from "@/utils/habit-history";
import CheckInsChart from "./checkins-chart";
import { plural } from "./format";
import HabitProgressItem from "./habit-progress-item";
import { palette } from "./palette";
import { CheckInsCard, GoalCompletionCard } from "./summary-cards";
import WeekHeader from "./week-header";

export interface StatisticsContentProps {
  data: UserStatistics;
  // As props abaixo são opcionais: sem elas o painel funciona só com `data`
  userName?: string;
  /** Progresso de cada dia da semana atual (bolinhas do topo) */
  week?: WeekDayProgress[];
  /** Grade de 28 dias de cada hábito, por `habit_id` */
  histories?: Record<string, HabitHistoryDay[]>;
  /** Categoria de cada hábito, por `habit_id` (define o ícone) */
  categories?: Record<string, HabitCategory>;
  onCheckIn?: (habitId: string) => void;
  onSeeAllHabits?: () => void;
}

// Só monta a tela com o que recebe: não chama a API
export default function StatisticsContent({
  data,
  userName,
  week,
  histories,
  categories,
  onCheckIn,
  onSeeAllHabits,
}: StatisticsContentProps) {
  const doneToday = data.habit_progress.filter((h) => h.checked_today).length;
  // Os que ainda faltam hoje vêm primeiro; os já feitos descem.
  // A cor do ícone segue a posição original para não trocar ao reordenar.
  const habits = data.habit_progress
    .map(
      (habit, index) =>
        ({ habit, tone: index % 2 === 0 ? "peach" : "sage" }) as const,
    )
    .sort(
      (a, b) => Number(a.habit.checked_today) - Number(b.habit.checked_today),
    );

  return (
    <View testID="statistics-content">
      <WeekHeader
        referenceDate={data.reference_date}
        week={week}
        userName={userName}
      />

      <View style={styles.sheet}>
        <View style={styles.inner}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitles}>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  Seus hábitos
                </Text>
                <Text style={styles.subtitle}>Um check-in de cada vez.</Text>
              </View>
              <View style={styles.sectionAside}>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>
                    {doneToday}/{data.habit_progress.length} hoje
                  </Text>
                </View>
                {onSeeAllHabits && (
                  <Pressable onPress={onSeeAllHabits} hitSlop={8}>
                    <Text style={styles.link}>
                      Ver {plural(data.habits.total, "hábito", "hábitos")}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            {habits.map(({ habit, tone }) => (
              <HabitProgressItem
                key={habit.habit_id}
                habit={habit}
                history={histories?.[habit.habit_id]}
                category={categories?.[habit.habit_id]}
                tone={tone}
                onCheckIn={
                  onCheckIn ? () => onCheckIn(habit.habit_id) : undefined
                }
              />
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Visão geral
              </Text>
              <Text style={styles.subtitle}>
                Últimos {plural(data.goal_completion.days, "dia", "dias")}
              </Text>
            </View>

            <View style={styles.row}>
              <CheckInsCard data={data} />
              <GoalCompletionCard data={data} />
            </View>
            <CheckInsChart
              points={data.series.points}
              activeHabits={data.habits.active}
              completedToday={data.completed_habits.today}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Folha clara que sobe por cima do cabeçalho escuro
  sheet: {
    marginTop: -22,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: palette.background,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 16,
  },
  // Em tablet o conteúdo não estica: fica centralizado com largura máxima
  inner: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  sectionTitles: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontFamily: theme.font.medium,
    fontSize: 21,
    color: palette.ink,
  },
  subtitle: {
    fontFamily: theme.font.regular,
    fontSize: 11,
    color: palette.inkSoft,
    paddingTop: 4,
  },
  sectionAside: {
    alignItems: "center",
    gap: 6,
  },
  pill: {
    backgroundColor: palette.pill,
    borderRadius: 15,
    paddingVertical: 7,
    paddingHorizontal: 22,
  },
  pillText: {
    fontFamily: theme.font.medium,
    fontSize: 11,
    color: palette.ink,
  },
  link: {
    fontFamily: theme.font.medium,
    fontSize: 10,
    color: palette.ink,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
});
