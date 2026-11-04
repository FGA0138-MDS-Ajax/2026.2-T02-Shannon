import type { Meta, StoryObj } from "@storybook/react-native";
import type {
  GoalPublic,
  HabitProgress,
  HabitWithProgress,
  ProgressStatus,
} from "@/services/types/habits";
import HabitCard from "./index";

const weeklyGoal: GoalPublic = {
  schedule_type: "frequency",
  period: "week",
  target_count: 4,
  period_end_weekday: 7,
  starts_on: "2026-10-05",
};

const baseHabit: HabitWithProgress = {
  id: "1",
  name: "Correr 5 km",
  description: null,
  category: "corrida",
  is_public: true,
  status: "active",
  author_user_id: "1",
  created_at: "2026-10-05",
  target_end_date: null,
  finished_at: null,
  goal: weeklyGoal,
  progress: null,
};

// Monta um progress semanal só trocando o que muda entre as histórias
function weeklyProgress(
  done: number,
  status: ProgressStatus,
  currentStreak = 3,
): HabitProgress {
  return {
    habit_id: "1",
    goal: weeklyGoal,
    current_period: {
      start: "2026-11-02",
      end: "2026-11-08",
      done,
      target_count: 4,
    },
    status,
    current_streak: currentStreak,
    best_streak: 5,
    streak_started_on: "2026-10-12",
    consistent_days: 14,
  };
}

const meta: Meta<typeof HabitCard> = {
  title: "Components/HabitCard",
  component: HabitCard,
  args: {
    habit: { ...baseHabit, progress: weeklyProgress(2, "in_progress") },
  },
};

export default meta;

type Story = StoryObj<typeof HabitCard>;

export const InProgress: Story = {};

export const AtRisk: Story = {
  args: {
    habit: { ...baseHabit, progress: weeklyProgress(1, "at_risk") },
  },
};

export const Completed: Story = {
  args: {
    habit: { ...baseHabit, progress: weeklyProgress(5, "completed", 4) },
  },
};

export const Daily: Story = {
  args: {
    habit: {
      ...baseHabit,
      name: "Meditar",
      category: "mente",
      progress: {
        ...weeklyProgress(0, "in_progress", 1),
        goal: { ...weeklyGoal, period: "day", target_count: 1 },
        current_period: {
          start: "2026-11-04",
          end: "2026-11-04",
          done: 0,
          target_count: 1,
        },
      },
    },
  },
};

export const WithoutGoal: Story = {
  args: {
    habit: { ...baseHabit, name: "Hábito antigo", goal: null, progress: null },
  },
};

export const Finished: Story = {
  args: {
    habit: {
      ...baseHabit,
      id: "2",
      name: "Ler 10 páginas",
      description: "Antes de dormir",
      category: "leitura",
      is_public: false,
      status: "finished",
      finished_at: "2026-10-20",
      progress: weeklyProgress(2, "ended"),
    },
  },
};
