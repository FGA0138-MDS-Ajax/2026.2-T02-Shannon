import { feedHabitStats } from "@/components/group-feed/__fixtures__/feed";
import {
  angleAround,
  angleDelta,
  ringPath,
  sliceAngles,
  slicePath,
} from "@/components/members-circle/geometry";
import {
  goalsForTodayLabel,
  groupToday,
  groupTodayLabel,
  habitsToday,
  memberRatio,
  membersToday,
  memberTodayLabel,
} from "@/utils/group-circle";

describe("habitsToday", () => {
  it("counts how many people finished each habit", () => {
    expect(
      habitsToday(feedHabitStats).map(
        ({ name, done, total }) => `${name}:${done}/${total}`,
      ),
    ).toEqual(["Pedalar:2/4", "Beber água:3/4", "Ler 10 páginas:3/4"]);
  });

  it("says how many individual goals there are today", () => {
    expect(goalsForTodayLabel({ done: 8, total: 12, percent: 67 })).toBe(
      "12 metas individuais para hoje.",
    );
    expect(goalsForTodayLabel({ done: 0, total: 1, percent: 0 })).toBe(
      "1 meta individual para hoje.",
    );
  });
});

const members = membersToday(feedHabitStats);

describe("membersToday", () => {
  it("builds one row per member, in the API order", () => {
    expect(members.map((member) => member.user.username)).toEqual([
      "Caio",
      "Ana",
      "Breno",
      "Lu",
    ]);
    expect(members.map(({ done, total }) => `${done}/${total}`)).toEqual([
      "3/3",
      "2/3",
      "2/3",
      "1/3",
    ]);
  });

  it("marks each habit as done only when the goal is completed", () => {
    const lu = members[3];
    expect(lu.habits.map(({ name, done }) => `${name}:${done}`)).toEqual([
      "Pedalar:true",
      "Beber água:false",
      "Ler 10 páginas:false",
    ]);
  });
});

describe("group totals", () => {
  it("adds every member and rounds the percent", () => {
    const totals = groupToday(members);
    expect(totals).toEqual({ done: 8, total: 12, percent: 67 });
    expect(groupTodayLabel(totals)).toBe("8 de 12 hábitos concluídos no grupo");
  });

  it("returns zero for a group without habits", () => {
    expect(groupToday([])).toEqual({ done: 0, total: 0, percent: 0 });
  });
});

describe("member labels", () => {
  it("shows done and pending habits", () => {
    expect(memberTodayLabel(members[1])).toBe("2 concluídos · 1 a fazer hoje");
    expect(memberTodayLabel(members[3])).toBe("1 concluído · 2 a fazer hoje");
  });

  it("gives the share of the day already done", () => {
    expect(memberRatio(members[0])).toBe(1);
    expect(memberRatio({ ...members[0], done: 0, total: 0 })).toBe(0);
  });
});

describe("circle geometry", () => {
  it("splits the circle into equal slices with a gap", () => {
    expect(sliceAngles(0, 4)).toEqual({ start: 4, end: 86 });
    expect(sliceAngles(3, 4)).toEqual({ start: 274, end: 356 });
  });

  it("draws a closed ring with a hole for a single person", () => {
    const path = ringPath({ cx: 100, cy: 100, inner: 48, outer: 126 });

    // Dois contornos: o de fora e o furo, cada um fechado
    expect(path.match(/M /g)).toHaveLength(2);
    expect(path.match(/Z/g)).toHaveLength(2);
    expect(path).toContain("M 100 -26");
    expect(path).toContain("M 100 52");
  });

  it("uses a smaller gap when there are many people", () => {
    const { start, end } = sliceAngles(0, 30);
    expect(start).toBeCloseTo(1.8);
    expect(end).toBeCloseTo(10.2);
  });

  it("draws a closed path", () => {
    const path = slicePath({
      cx: 134,
      cy: 134,
      inner: 48,
      outer: 126,
      start: 4,
      end: 86,
      corner: 12,
    });
    expect(path.startsWith("M ")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path).not.toContain("NaN");
  });

  it("measures the finger angle from the top, clockwise", () => {
    const center = { x: 100, y: 100 };
    expect(angleAround(center, { x: 100, y: 0 })).toBeCloseTo(0);
    expect(angleAround(center, { x: 200, y: 100 })).toBeCloseTo(90);
    expect(angleAround(center, { x: 0, y: 100 })).toBeCloseTo(-90);
  });

  it("turns by the shortest way across the bottom", () => {
    expect(angleDelta(10, 40)).toBe(30);
    expect(angleDelta(40, 10)).toBe(-30);
    expect(angleDelta(170, -170)).toBe(20);
    expect(angleDelta(-170, 170)).toBe(-20);
  });
});
