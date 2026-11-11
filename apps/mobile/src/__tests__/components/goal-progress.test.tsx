import { render } from "@testing-library/react-native";
import GoalProgress from "@/components/goal-progress";
import type { HabitProgress } from "@/services/types/habits";

const progress: HabitProgress = {
  habit_id: "habit-1",
  goal: {
    schedule_type: "frequency",
    period: "week",
    target_count: 3,
    period_end_weekday: 7,
    starts_on: "2026-11-02",
  },
  current_period: {
    start: "2026-11-02",
    end: "2026-11-08",
    done: 2,
    target_count: 3,
  },
  status: "in_progress",
  current_streak: 2,
  best_streak: 4,
  streak_started_on: "2026-11-02",
  consistent_days: 10,
};

describe("GoalProgress", () => {
  it("shows the current streak and record", async () => {
    const screen = await render(<GoalProgress progress={progress} />);

    expect(screen.getByText("Streak: 2 semanas")).toBeTruthy();
    expect(screen.getByText("Recorde: 4 semanas")).toBeTruthy();
  });

  it.each([
    ["completed", "Meta do período cumprida", 3],
    ["in_progress", "Falta 1", 2],
    ["at_risk", "Não pode faltar nenhum dia", 1],
    ["failed", "Este período não fecha mais; recomece no próximo", 2],
    ["ended", "Streak final", 2],
  ] as const)(
    "renders the %s status",
    async (status, label, done) => {
      const statusProgress: HabitProgress = {
        ...progress,
        status,
        current_period: { ...progress.current_period, done },
      };
      const screen = await render(
        <GoalProgress progress={statusProgress} />,
      );

      expect(screen.getByText(label)).toBeTruthy();
      if (status === "at_risk") {
        expect(screen.getByTestId("goal-progress-status")).toHaveStyle({
          color: "#C2410C",
        });
      }
    },
  );

  it("caps the progress bar at 100 percent", async () => {
    const overTarget: HabitProgress = {
      ...progress,
      current_period: { ...progress.current_period, done: 4 },
    };
    const screen = await render(<GoalProgress progress={overTarget} />);

    expect(screen.getByText("4 de 3")).toBeTruthy();
    expect(screen.getByTestId("goal-progress-fill")).toHaveStyle({
      width: "100%",
    });
  });

  it("omits consistency when the streak has no start date", async () => {
    const noStartDate: HabitProgress = {
      ...progress,
      streak_started_on: null,
    };
    const screen = await render(<GoalProgress progress={noStartDate} />);

    expect(screen.queryByText(/Constante desde/)).toBeNull();
  });
});
