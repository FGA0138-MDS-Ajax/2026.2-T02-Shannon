import { theme } from "@/config/theme";
import type {
  GroupHabitStatistics,
  GroupMember,
} from "@/services/types/groups";
import type { HabitProgress, ProgressStatus } from "@/services/types/habits";
import {
  groupPeriod,
  groupPeriodLabel,
  habitsPeriod,
  memberColors,
  memberPeriodLabel,
  membersPeriod,
} from "@/utils/group-period";

function progress(status: ProgressStatus): HabitProgress {
  return {
    habit_id: "h",
    goal: {
      schedule_type: "frequency",
      period: "day",
      target_count: 1,
      period_end_weekday: null,
      starts_on: "2026-11-01",
    },
    current_period: {
      start: "2026-11-25",
      end: "2026-11-25",
      done: status === "completed" ? 1 : 0,
      target_count: 1,
    },
    status,
    current_streak: 0,
    best_streak: 0,
    streak_started_on: null,
    consistent_days: 0,
  };
}

function habit(
  id: string,
  members: [string, ProgressStatus][],
): GroupHabitStatistics {
  return {
    as_of: "2026-11-25",
    habit_id: id,
    name: `Hábito ${id}`,
    habit_status: "active",
    members: members.map(([user, status]) => ({
      user: { id: user, username: user },
      progress: progress(status),
      check_in_days: 0,
    })),
  };
}

function member(id: string, joinedAt: string): GroupMember {
  return { user_id: id, username: id, role: "member", joined_at: joinedAt };
}

// Ordem de entrada: caio antes de ana
const groupMembers = [
  member("ana", "2026-11-03T10:00:00Z"),
  member("caio", "2026-11-01T10:00:00Z"),
];

const stats = [
  habit("a", [
    ["ana", "completed"],
    ["caio", "in_progress"],
  ]),
  habit("b", [
    ["ana", "at_risk"],
    ["caio", "completed"],
  ]),
  habit("c", [["ana", "completed"]]),
];

describe("membersPeriod", () => {
  it("joins every habit into one row per member", () => {
    const [caio, ana] = membersPeriod(stats, groupMembers);

    expect(ana.user.username).toBe("ana");
    expect(ana).toMatchObject({ done: 2, total: 3 });
    expect(ana.habits.map((h) => h.done)).toEqual([true, false, true]);
    expect(caio).toMatchObject({ done: 1, total: 2 });
  });
});

describe("membersPeriod order", () => {
  it("follows the join order, not the API streak order", () => {
    const order = membersPeriod(stats, groupMembers).map((m) => m.user.id);

    expect(order).toEqual(["caio", "ana"]);
  });

  it("puts members who left the group at the end", () => {
    const order = membersPeriod(stats, [groupMembers[0]]).map((m) => m.user.id);

    expect(order).toEqual(["ana", "caio"]);
  });
});

describe("groupPeriod", () => {
  it("adds up every member's goals", () => {
    const today = groupPeriod(membersPeriod(stats, groupMembers));

    expect(today).toEqual({ done: 3, total: 5, percent: 60 });
    expect(groupPeriodLabel(today)).toBe("3 de 5 metas cumpridas no grupo");
  });

  it("is zero without habits", () => {
    expect(groupPeriod([])).toEqual({ done: 0, total: 0, percent: 0 });
  });
});

describe("habitsPeriod", () => {
  it("counts who met each habit goal", () => {
    expect(habitsPeriod(stats).map(({ done, total }) => [done, total])).toEqual(
      [
        [1, 2],
        [1, 2],
        [1, 1],
      ],
    );
  });
});

describe("memberPeriodLabel", () => {
  it("uses singular and plural", () => {
    const [caio, ana] = membersPeriod(stats, groupMembers);

    expect(memberPeriodLabel(ana)).toBe("2 cumpridas · 1 pendente");
    expect(memberPeriodLabel(caio)).toBe("1 cumprida · 1 pendente");
  });
});

describe("memberColors", () => {
  it("gives each member a color by join order", () => {
    const colorOf = memberColors(groupMembers);

    expect(colorOf("caio")).toBe(theme.memberColors[0]);
    expect(colorOf("ana")).toBe(theme.memberColors[1]);
    expect(colorOf("unknown")).toBe(theme.colors.subtle);
  });
});
