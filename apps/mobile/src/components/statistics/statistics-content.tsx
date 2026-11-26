import { StyleSheet, View } from "react-native";
import { Section } from "@/components/ui";
import type { HabitCategory } from "@/services/types/habits";
import type { UserStatistics } from "@/services/types/statistics";
import type { HabitHistoryDay, WeekDayProgress } from "@/utils/habit-history";
import CheckInsChart from "./checkins-chart";
import HabitProgressItem from "./habit-progress-item";
import { CheckInsCard, GoalCompletionCard } from "./summary-cards";
import WeekHeader from "./week-header";

export interface StatisticsContentProps {
  data: UserStatistics;
  // As props abaixo são opcionais: sem elas o painel funciona só com `data`
  userName?: string;
  /** Progresso de cada dia da semana atual (anéis do topo) */
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
  // Os que ainda faltam hoje vêm primeiro; os já feitos descem
  const habits = [...data.habit_progress].sort(
    (a, b) => Number(a.checked_today) - Number(b.checked_today),
  );

  return (
    <View testID="statistics-content">
      <WeekHeader
        referenceDate={data.reference_date}
        week={week}
        userName={userName}
      />

      <Section
        title="Seus hábitos"
        count={`${doneToday}/${data.habit_progress.length} hoje`}
        actionLabel="Ver todos"
        onAction={onSeeAllHabits}
      >
        {habits.map((habit) => (
          <HabitProgressItem
            key={habit.habit_id}
            habit={habit}
            history={histories?.[habit.habit_id]}
            category={categories?.[habit.habit_id]}
            onCheckIn={onCheckIn ? () => onCheckIn(habit.habit_id) : undefined}
          />
        ))}
      </Section>

      <Section title="Visão geral">
        <View style={styles.row}>
          <CheckInsCard data={data} />
          <GoalCompletionCard data={data} />
        </View>
        <CheckInsChart
          points={data.series.points}
          activeHabits={data.habits.active}
          completedToday={data.completed_habits.today}
        />
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
  },
});
