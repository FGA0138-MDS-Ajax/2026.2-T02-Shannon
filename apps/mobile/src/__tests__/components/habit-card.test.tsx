import { fireEvent, render } from "@testing-library/react-native";
import HabitCard from "@/components/habit-card";
import type {
  HabitProgress,
  HabitWithProgress,
  ProgressStatus,
} from "@/services/types/habits";

const goal = {
  schedule_type: "frequency" as const,
  period: "week" as const,
  target_count: 4,
  period_end_weekday: 7,
  starts_on: "2026-10-05",
};

function makeProgress(done: number, status: ProgressStatus): HabitProgress {
  return {
    habit_id: "1",
    goal,
    current_period: {
      start: "2026-11-02",
      end: "2026-11-08",
      done,
      target_count: 4,
    },
    status,
    current_streak: 3,
    best_streak: 5,
    streak_started_on: "2026-10-12",
    consistent_days: 14,
  };
}

function makeHabit(progress: HabitProgress | null): HabitWithProgress {
  return {
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
    goal: progress ? goal : null,
    progress,
  };
}

describe("HabitCard", () => {
  it("shows the period progress, streaks and status", async () => {
    const { getByText } = await render(
      <HabitCard habit={makeHabit(makeProgress(2, "in_progress"))} />,
    );

    expect(getByText("2/4 nesta semana")).toBeTruthy();
    expect(getByText("4x por semana, fecha no domingo")).toBeTruthy();
    expect(getByText("Streak: 3 semanas · Melhor: 5 semanas")).toBeTruthy();
    expect(getByText("Faltam 2")).toBeTruthy();
  });

  it("highlights a habit at risk", async () => {
    const { getByTestId } = await render(
      <HabitCard habit={makeHabit(makeProgress(1, "at_risk"))} />,
    );

    expect(getByTestId("habit-progress-status")).toHaveTextContent(
      "⚠ Não pode faltar nenhum dia",
    );
  });

  it("renders an old habit without goal and still opens it", async () => {
    const onPress = jest.fn();
    const { getByText, queryByTestId, getByTestId } = await render(
      <HabitCard habit={makeHabit(null)} onPress={onPress} />,
    );

    expect(getByText("Sem meta · toque para definir")).toBeTruthy();
    expect(queryByTestId("habit-progress")).toBeNull();

    fireEvent.press(getByTestId("habit-card"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
