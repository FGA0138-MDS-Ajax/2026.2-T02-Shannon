import type { Meta, StoryObj } from "@storybook/react-native";
import type { HabitProgress } from "@/services/types/habits";
import GoalProgress from "./index";

// Valores do exemplo real do contrato da API (meta semanal 4x)
const weekly: HabitProgress = {
  habit_id: "1",
  goal: {
    schedule_type: "frequency",
    period: "week",
    target_count: 4,
    period_end_weekday: 7,
    starts_on: "2026-09-30",
  },
  current_period: {
    start: "2026-10-26",
    end: "2026-11-01",
    done: 3,
    target_count: 4,
  },
  status: "in_progress",
  current_streak: 1,
  best_streak: 1,
  streak_started_on: "2026-10-19",
  consistent_days: 12,
};

const meta: Meta<typeof GoalProgress> = {
  title: "Components/GoalProgress",
  component: GoalProgress,
  args: {
    progress: weekly,
  },
};

export default meta;

type Story = StoryObj<typeof GoalProgress>;

export const InProgress: Story = {};

export const Completed: Story = {
  args: {
    progress: {
      ...weekly,
      current_period: { ...weekly.current_period, done: 5 },
      status: "completed",
      current_streak: 2,
      best_streak: 2,
    },
  },
};

export const AtRisk: Story = {
  args: {
    progress: {
      ...weekly,
      goal: { ...weekly.goal, period: "day", target_count: 1 },
      current_period: {
        start: "2026-11-06",
        end: "2026-11-06",
        done: 0,
        target_count: 1,
      },
      status: "at_risk",
      current_streak: 4,
      best_streak: 4,
      streak_started_on: "2026-11-02",
      consistent_days: 5,
    },
  },
};

export const Failed: Story = {
  args: {
    progress: {
      ...weekly,
      status: "failed",
      current_streak: 0,
      streak_started_on: null,
      consistent_days: 0,
    },
  },
};

export const Ended: Story = {
  args: {
    progress: { ...weekly, status: "ended" },
  },
};
