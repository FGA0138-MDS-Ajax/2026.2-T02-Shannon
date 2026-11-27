import {
  describeGoal,
  describeProgressStatus,
  formatStreak,
} from "@/config/goal-labels";
import type { HabitProgress } from "@/services/types/habits";

function makeProgress(
  overrides: Partial<HabitProgress> = {},
): HabitProgress {
  return {
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
    streak_started_on: "2026-10-19",
    consistent_days: 10,
    ...overrides,
  };
}

describe("describeGoal", () => {
  it("describes a daily goal", () => {
    const goal = { period: "day", target_count: 1 } as const;
    const label = describeGoal(goal);

    expect(label).toBe("Todo dia");
  });

  it("describes a weekly goal without a closing weekday", () => {
    const goal = {
      period: "week",
      target_count: 4,
      period_end_weekday: null,
    } as const;
    const label = describeGoal(goal);

    expect(label).toBe("4x por semana");
  });

  it("includes the closing weekday in a weekly goal", () => {
    const goal = {
      period: "week",
      target_count: 3,
      period_end_weekday: 7,
    } as const;
    const label = describeGoal(goal);

    expect(label).toBe("3x por semana, fecha no domingo");
  });

  it("formats a monthly goal with its target count", () => {
    const goal = { period: "month", target_count: 15 } as const;
    const label = describeGoal(goal);

    expect(label).toBe("15x por mês");
  });
});

describe("formatStreak", () => {
  it("uses the singular unit for one weekly streak", () => {
    expect(formatStreak(1, "week")).toBe("1 semana");
  });

  it.each([
    [1, "day", "1 dia"],
    [5, "day", "5 dias"],
    [3, "week", "3 semanas"],
    [1, "month", "1 mês"],
    [6, "month", "6 meses"],
    [0, "week", "0 semanas"],
  ] as const)("formats %s %s streaks", (count, period, expected) => {
    expect(formatStreak(count, period)).toBe(expected);
  });
});

describe("describeProgressStatus", () => {
  it("describes an at-risk period", () => {
    const progress = makeProgress({ status: "at_risk" });
    const message = describeProgressStatus(progress);

    expect(message).toBe("Não pode faltar nenhum dia");
  });

  it.each([
    ["completed", "Meta do período cumprida"],
    ["failed", "Este período não fecha mais; recomece no próximo"],
    ["ended", "Streak final"],
  ] as const)("describes the %s status", (status, expected) => {
    const progress = makeProgress({ status });
    const message = describeProgressStatus(progress);

    expect(message).toBe(expected);
  });

  it.each([
    [2, 3, "Falta 1"],
    [1, 4, "Faltam 3"],
  ] as const)(
    "reports missing check-ins when %s of %s are done",
    (done, targetCount, expected) => {
      const progress = makeProgress({
        current_period: {
          start: "2026-11-02",
          end: "2026-11-08",
          done,
          target_count: targetCount,
        },
      });

      expect(describeProgressStatus(progress)).toBe(expected);
    },
  );
});
