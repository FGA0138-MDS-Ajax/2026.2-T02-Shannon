import { isAffectedByCheckIn } from "@/services/check-ins-api";
import { groupKeys, isGroupDataKey } from "@/services/groups-api";
import { habitKeys } from "@/services/habits-api";
import { statisticsKeys } from "@/services/statistics-api";

describe("isGroupDataKey", () => {
  it("matches group routes, plain or in array keys", () => {
    expect(isGroupDataKey(groupKeys.ranking("g1"))).toBe(true);
    expect(isGroupDataKey(groupKeys.allHabitsStats("g1", ["h1"]))).toBe(true);
    expect(isGroupDataKey(groupKeys.list)).toBe(false);
    expect(isGroupDataKey("/habits")).toBe(false);
  });
});

describe("isAffectedByCheckIn", () => {
  it("covers the Home and the group screens", () => {
    expect(isAffectedByCheckIn(statisticsKeys.habitsCheckIns(["h1"]))).toBe(
      true,
    );
    expect(isAffectedByCheckIn(groupKeys.feed("g1", { limit: 20 }))).toBe(true);
    // A folha de check-in rápido conta os check-ins do hábito por esta chave
    expect(isAffectedByCheckIn(habitKeys.checkIns("h1"))).toBe(true);
    expect(isAffectedByCheckIn(habitKeys.progress("h1"))).toBe(true);
    expect(isAffectedByCheckIn("/check-ins/categories")).toBe(false);
  });
});
