import type { FeedItem, GroupHabit } from "@/services/types/groups";
import type { HabitProgress } from "@/services/types/habits";
import {
  checkInHabitDetails,
  joinHabitNames,
  latestCheckIn,
  periodProgressLabel,
} from "@/utils/group-feed";

function item(id: string, author: string, habitIds: string[]): FeedItem {
  return {
    cursor: id,
    id,
    author: { id: author, username: author },
    title: "Treino",
    description: null,
    habits: habitIds.map((habitId) => ({ id: habitId, name: habitId })),
    created_at: "2026-11-25T10:00:00Z",
  };
}

describe("joinHabitNames", () => {
  it.each([
    [[], ""],
    [["Pedalar"], "Pedalar"],
    [["Pedalar", "Ler"], "Pedalar e Ler"],
    [["Pedalar", "Ler", "Meditar"], "Pedalar, Ler e Meditar"],
  ])("joins %j", (names, expected) => {
    expect(joinHabitNames(names.map((name) => ({ name })))).toBe(expected);
  });
});

describe("latestCheckIn", () => {
  it("finds the newest check-in of the member in the habit", () => {
    const items = [
      item("3", "caio", ["ler"]),
      item("2", "ana", ["ler", "correr"]),
      item("1", "ana", ["correr"]),
    ];

    expect(latestCheckIn(items, "ana", "correr")?.id).toBe("2");
    expect(latestCheckIn(items, "ana", "meditar")).toBeUndefined();
  });
});

describe("checkInHabitDetails", () => {
  it("keeps the feed order and skips unknown habits", () => {
    const ler = { id: "ler", name: "Ler" } as GroupHabit;
    const progress = { status: "completed" } as HabitProgress;
    const members = [
      {
        user: { id: "ana", username: "ana" },
        habits: [{ habitId: "ler", name: "Ler", progress, done: true }],
        done: 1,
        total: 1,
      },
    ];

    const details = checkInHabitDetails(
      item("1", "ana", ["sumiu", "ler"]),
      new Map([["ler", ler]]),
      members,
    );

    expect(details).toEqual([{ habit: ler, progress }]);
  });
});

describe("periodProgressLabel", () => {
  it("shows the days done over the target", () => {
    const progress = (
      done: number,
      target_count: number,
      period: "day" | "week",
    ) =>
      ({
        goal: { period },
        current_period: { start: "", end: "", done, target_count },
      }) as HabitProgress;

    expect(periodProgressLabel(progress(1, 1, "day"))).toBe("1 de 1 hoje");
    expect(periodProgressLabel(progress(2, 4, "week"))).toBe(
      "2 de 4 nesta semana",
    );
  });
});
