import { applyGroupStatusFix, matchCheckInProgress } from "@/utils/check-in-progress";
import type { HabitProgress } from "@/services/types/habits";

function progress(status: HabitProgress["status"]): HabitProgress {
  return {
    habit_id: "h1",
    goal: { schedule_type: "frequency", period: "week", target_count: 3, period_end_weekday: 7, starts_on: "2026-11-01" },
    current_period: { start: "2026-11-23", end: "2026-11-29", done: 1, target_count: 3 },
    status, current_streak: 2, best_streak: 4, streak_started_on: null, consistent_days: 5,
  };
}

describe("applyGroupStatusFix (contorno L1)", () => {
  it("progress.status 'ended' por engano -> situação correta do item do usuário em /stats", () => {
    const broken = progress("ended");
    const fixed = applyGroupStatusFix(broken, "in_progress");
    expect(fixed.status).toBe("in_progress");
  });

  it("demais números do progress continuam vindo do progress normal", () => {
    const broken = progress("ended");
    const fixed = applyGroupStatusFix(broken, "completed");
    expect(fixed.current_period.done).toBe(1);
    expect(fixed.current_period.target_count).toBe(3);
    expect(fixed.current_streak).toBe(2);
    expect(fixed.best_streak).toBe(4);
    expect(fixed.consistent_days).toBe(5);
  });

  it("sem situação correta conhecida, deixa inalterado", () => {
    const p = progress("ended");
    expect(applyGroupStatusFix(p, null)).toBe(p);
    expect(applyGroupStatusFix(p, undefined)).toBe(p);
  });
});

describe("matchCheckInProgress", () => {
  it("casa por habit_id e ignora hábitos sem meta", () => {
    const items = matchCheckInProgress(
      [{ id: "h1", name: "Correr" }, { id: "h2", name: "Ler" }],
      [progress("completed")],
    );
    expect(items.map((i) => i.name)).toEqual(["Correr"]);
  });
});
