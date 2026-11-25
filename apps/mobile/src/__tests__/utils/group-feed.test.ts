import {
  feedGroupHabits,
  feedHabitStats,
} from "@/components/group-feed/__fixtures__/feed";
import type { HabitProgress } from "@/services/types/habits";
import {
  checkInHabitDetails,
  checkInPhrase,
  indexMemberProgress,
  joinHabitNames,
  periodProgressLabel,
} from "@/utils/group-feed";

const habitsById = new Map(feedGroupHabits.map((habit) => [habit.id, habit]));
const progress = indexMemberProgress(feedHabitStats);

describe("checkInPhrase", () => {
  it("builds the sentence with the author", () => {
    expect(checkInPhrase("Caio")).toBe("Caio fez check-in em");
  });
});

describe("joinHabitNames", () => {
  it("returns a single name as is", () => {
    expect(joinHabitNames([{ name: "Pedalar" }])).toBe("Pedalar");
  });

  it("joins two names with 'e'", () => {
    expect(joinHabitNames([{ name: "Pedalar" }, { name: "Ler" }])).toBe(
      "Pedalar e Ler",
    );
  });

  it("uses commas before the last name", () => {
    expect(
      joinHabitNames([
        { name: "Pedalar" },
        { name: "Ler" },
        { name: "Meditar" },
      ]),
    ).toBe("Pedalar, Ler e Meditar");
  });

  it("returns an empty text without habits", () => {
    expect(joinHabitNames([])).toBe("");
  });
});

describe("checkInHabitDetails", () => {
  it("pairs each habit with the author's progress, in the feed order", () => {
    const details = checkInHabitDetails(
      {
        author: { id: "u1", username: "Caio" },
        habits: [
          { id: "h3", name: "Ler 10 páginas" },
          { id: "h2", name: "Beber água" },
        ],
      },
      habitsById,
      progress,
    );

    expect(details.map((detail) => detail.habit.name)).toEqual([
      "Ler 10 páginas",
      "Beber água",
    ]);
    expect(details[0].progress?.habit_id).toBe("h3");
    expect(details[0].progress?.status).toBe("completed");
  });

  it("skips habits missing from the group list", () => {
    const details = checkInHabitDetails(
      {
        author: { id: "u1", username: "Caio" },
        habits: [{ id: "unknown", name: "Correr" }],
      },
      habitsById,
      progress,
    );

    expect(details).toEqual([]);
  });

  it("leaves the progress empty for a member without stats", () => {
    const [detail] = checkInHabitDetails(
      {
        author: { id: "new-member", username: "Bia" },
        habits: [{ id: "h1", name: "Pedalar" }],
      },
      habitsById,
      progress,
    );

    expect(detail.progress).toBeUndefined();
  });
});

describe("periodProgressLabel", () => {
  const base = feedHabitStats[0].members[0].progress;

  function withPeriod(done: number, target: number): HabitProgress {
    return {
      ...base,
      current_period: { ...base.current_period, done, target_count: target },
    };
  }

  it("uses the singular for a one-day goal", () => {
    expect(periodProgressLabel(withPeriod(1, 1))).toBe("1 / 1 dia");
  });

  it("uses the plural for longer goals", () => {
    expect(periodProgressLabel(withPeriod(3, 4))).toBe("3 / 4 dias");
  });
});
