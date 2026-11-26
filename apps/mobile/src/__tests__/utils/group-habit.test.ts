import type { HabitWithProgress } from "@/services/types/habits";
import { groupHomeHabits, progressStatus } from "@/utils/group-habit";

const TODAY = "2026-11-25";

function habit(overrides: Partial<HabitWithProgress> = {}): HabitWithProgress {
  return {
    id: "h1",
    name: "Pedalar",
    description: null,
    category: "ciclismo",
    is_public: false,
    status: "active",
    author_user_id: null,
    author_group_id: "g1",
    created_at: "2026-11-02",
    target_end_date: null,
    finished_at: null,
    goal: null,
    group: { id: "g1", name: "Movimento diário" },
    progress: {
      habit_id: "h1",
      goal: {
        schedule_type: "frequency",
        period: "day",
        target_count: 1,
        period_end_weekday: null,
        starts_on: "2026-11-02",
      },
      current_period: { start: TODAY, end: TODAY, done: 0, target_count: 1 },
      // Bug L1: hábito de grupo ativo vem como encerrado
      status: "ended",
      current_streak: 0,
      best_streak: 0,
      streak_started_on: null,
      consistent_days: 0,
    },
    ...overrides,
  };
}

describe("progressStatus", () => {
  it("fixes the wrong 'ended' of an active group habit", () => {
    const pending = habit();
    const done = habit();
    if (!pending.progress || !done.progress) throw new Error("sem progresso");
    done.progress = {
      ...done.progress,
      current_period: { ...done.progress.current_period, done: 1 },
    };

    expect(progressStatus(pending, pending.progress)).toBe("in_progress");
    expect(progressStatus(done, done.progress)).toBe("completed");
  });

  it("keeps the status of personal habits", () => {
    const personal = habit({ group: null, author_group_id: null });
    if (!personal.progress) throw new Error("sem progresso");

    expect(progressStatus(personal, personal.progress)).toBe("ended");
  });
});

describe("groupHomeHabits", () => {
  it("lists only the active group habits, done today from your check-ins", () => {
    const habits = [
      habit(),
      habit({ id: "h2", name: "Ler" }),
      habit({ id: "h3", group: null, author_group_id: null }),
      habit({ id: "h4", status: "finished" }),
    ];

    const result = groupHomeHabits(habits, { h2: new Set([TODAY]) }, TODAY);

    expect(result.map((item) => item.habit_id)).toEqual(["h1", "h2"]);
    expect(result[0]).toMatchObject({
      checked_today: false,
      status: "in_progress",
      group: { name: "Movimento diário" },
    });
    expect(result[1].checked_today).toBe(true);
  });

  it("shows nobody done before the history arrives", () => {
    expect(groupHomeHabits([habit()], undefined, TODAY)[0].checked_today).toBe(
      false,
    );
  });
});
