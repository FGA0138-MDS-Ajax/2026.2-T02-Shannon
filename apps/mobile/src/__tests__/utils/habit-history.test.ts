import type { CheckIn } from "@/services/types/habits";
import {
  buildHabitHistory,
  buildWeekProgress,
  checkInDates,
  weekDates,
} from "@/utils/habit-history";

function checkIn(createdAt: string): CheckIn {
  return {
    id: createdAt,
    user_id: "user",
    title: "Check-in",
    description: null,
    created_at: createdAt,
    duration: null,
    habit_ids: ["habit"],
  };
}

describe("checkInDates", () => {
  it("uses the local day of each check-in, without repeating days", () => {
    // Meio-dia em UTC cai no mesmo dia em qualquer fuso do Brasil
    const dates = checkInDates([
      checkIn("2026-11-10T12:00:00Z"),
      checkIn("2026-11-10T13:00:00Z"),
      checkIn("2026-11-12T12:00:00Z"),
    ]);

    expect([...dates]).toEqual(["2026-11-10", "2026-11-12"]);
  });
});

describe("buildHabitHistory", () => {
  it("returns 28 days ending today, oldest first", () => {
    const history = buildHabitHistory(
      new Set(["2026-11-13", "2026-10-17"]),
      "2026-11-13",
    );

    expect(history).toHaveLength(28);
    expect(history[0]).toEqual({ date: "2026-10-17", checked: true });
    expect(history[27]).toEqual({ date: "2026-11-13", checked: true });
    expect(history.filter((day) => day.checked)).toHaveLength(2);
  });
});

describe("weekDates", () => {
  it("goes from Monday to Sunday", () => {
    // 13/11/2026 é sexta-feira
    expect(weekDates("2026-11-13")).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
    ]);
  });

  it("keeps Sunday in the week that started on Monday", () => {
    expect(weekDates("2026-11-15")[0]).toBe("2026-11-09");
  });
});

describe("buildWeekProgress", () => {
  it("counts the habits done and the habits that had started each day", () => {
    const week = buildWeekProgress(
      [
        { habit_id: "water", starts_on: "2026-11-01" },
        { habit_id: "run", starts_on: "2026-11-11" },
      ],
      {
        water: new Set(["2026-11-09", "2026-11-11"]),
        run: new Set(["2026-11-11"]),
      },
      "2026-11-13",
    );

    expect(week[0]).toEqual({ date: "2026-11-09", done: 1, total: 1 });
    expect(week[1]).toEqual({ date: "2026-11-10", done: 0, total: 1 });
    expect(week[2]).toEqual({ date: "2026-11-11", done: 2, total: 2 });
  });
});
