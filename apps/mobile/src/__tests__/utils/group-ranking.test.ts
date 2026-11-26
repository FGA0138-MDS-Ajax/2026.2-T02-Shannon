import type { RankingItem } from "@/services/types/groups";
import {
  belowPodium,
  formatScore,
  nobodyScored,
  podiumSlots,
} from "@/utils/group-ranking";

function item(position: number, id: string, score: number): RankingItem {
  return { position, user: { id, username: id }, score };
}

const items = [
  item(1, "ana", 9),
  item(1, "caio", 9),
  item(3, "bia", 4),
  item(4, "duda", 0),
];

describe("podiumSlots", () => {
  it("puts the first item in the middle and keeps tied positions", () => {
    const { left, center, right } = podiumSlots(items);

    expect(center?.user.id).toBe("ana");
    expect(left).toMatchObject({ position: 1, user: { id: "caio" } });
    expect(right?.user.id).toBe("bia");
  });

  it("leaves empty places in small groups", () => {
    expect(podiumSlots(items.slice(0, 1))).toEqual({
      center: items[0],
      left: undefined,
      right: undefined,
    });
  });
});

describe("belowPodium", () => {
  it("lists from the fourth item on", () => {
    expect(belowPodium(items).map((i) => i.user.id)).toEqual(["duda"]);
  });
});

describe("nobodyScored", () => {
  it("is true for an empty list or everyone at zero", () => {
    expect(nobodyScored({ items: [] })).toBe(true);
    expect(nobodyScored({ items: [item(1, "ana", 0)] })).toBe(true);
    expect(nobodyScored({ items })).toBe(false);
  });
});

describe("formatScore", () => {
  it("uses the criterion unit", () => {
    expect(formatScore(1, "check_ins")).toBe("1 dia");
    expect(formatScore(3, "goals")).toBe("3 metas");
  });
});
