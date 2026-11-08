import type { HabitProgress } from "@/services/types/habits";
import { matchCheckInProgress } from "@/utils/check-in-progress";

function makeProgress(habitId: string, done = 1): HabitProgress {
  return {
    habit_id: habitId,
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
      done,
      target_count: 3,
    },
    status: "in_progress",
    current_streak: 0,
    best_streak: 0,
    streak_started_on: null,
    consistent_days: done,
  };
}

const habits = [
  { id: "h1", name: "Correr 5 km" },
  { id: "h2", name: "Ler 20 páginas" },
];

describe("matchCheckInProgress", () => {
  it("matches by habit_id and keeps the order of the habits, not of the API", () => {
    const progress = [makeProgress("h2", 2), makeProgress("h1", 1)];

    const items = matchCheckInProgress(habits, progress);

    expect(items.map((item) => item.name)).toEqual([
      "Correr 5 km",
      "Ler 20 páginas",
    ]);
    expect(items[0].progress.current_period.done).toBe(1);
    expect(items[1].progress.current_period.done).toBe(2);
  });

  it("skips habits without a goal, which are missing from progress", () => {
    const items = matchCheckInProgress(habits, [makeProgress("h2")]);

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Ler 20 páginas");
  });

  it("returns an empty list when no habit has a goal", () => {
    expect(matchCheckInProgress(habits, [])).toEqual([]);
  });

  it("ignores progress of habits that are not in the list", () => {
    const items = matchCheckInProgress(habits, [makeProgress("other")]);

    expect(items).toEqual([]);
  });
});
