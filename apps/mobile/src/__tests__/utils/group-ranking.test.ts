import {
  feedGroupStats,
  feedRanking,
} from "@/components/group-feed/__fixtures__/feed";
import type { RankingItem } from "@/services/types/groups";
import {
  belowPodium,
  bestRecordLabel,
  finalResultLabel,
  lastWeekLabel,
  mostConsistentLabel,
  nobodyScored,
  ordinal,
  podiumSlots,
  pointsLabel,
} from "@/utils/group-ranking";

const item = (position: number, username: string, score: number) =>
  ({ position, user: { id: username, username }, score }) as RankingItem;

describe("podiumSlots", () => {
  it("puts the first item in the middle, the second on the left and the third on the right", () => {
    const { left, center, right } = podiumSlots(feedRanking.items);
    expect(center?.user.username).toBe("Caio");
    expect(left?.user.username).toBe("Ana");
    expect(right?.user.username).toBe("Breno");
  });

  it("keeps the positions from the API, ties included", () => {
    const { left, center } = podiumSlots([
      item(1, "Caio", 128),
      item(1, "Ana", 128),
      item(3, "Breno", 112),
    ]);
    expect(center?.position).toBe(1);
    expect(left?.position).toBe(1);
  });

  it("leaves empty places in small groups", () => {
    const { left, right } = podiumSlots([item(1, "Caio", 10)]);
    expect(left).toBeUndefined();
    expect(right).toBeUndefined();
  });
});

describe("belowPodium", () => {
  it("lists from the fourth item on", () => {
    expect(belowPodium(feedRanking.items).map((i) => i.user.username)).toEqual([
      "Lu",
    ]);
  });
});

describe("nobodyScored", () => {
  it("is true when everyone has zero", () => {
    expect(
      nobodyScored({ items: [item(1, "Caio", 0), item(1, "Ana", 0)] }),
    ).toBe(true);
  });

  it("is false when someone scored", () => {
    expect(nobodyScored(feedRanking)).toBe(false);
  });
});

describe("ranking texts", () => {
  it("formats places, points and the final date", () => {
    expect(ordinal(2)).toBe("2º");
    expect(pointsLabel(112)).toBe("112 pts");
    expect(finalResultLabel("2026-12-31")).toBe(
      "Resultado final em 31/12/2026",
    );
  });

  it("builds the statistics sentences", () => {
    expect(mostConsistentLabel(feedGroupStats)).toBe(
      "Ana em Ler 10 páginas, há 12 dias",
    );
    expect(bestRecordLabel(feedGroupStats)).toBe("Caio em Pedalar, 3 semanas");
    expect(lastWeekLabel(feedGroupStats)).toBe(
      "23 check-ins nos últimos 7 dias",
    );
  });

  it("explains when there is no statistic yet", () => {
    const empty = {
      ...feedGroupStats,
      most_consistent: null,
      best_record: null,
      check_ins_last_7_days: 1,
    };
    expect(mostConsistentLabel(empty)).toBe("Sem sequência registrada ainda.");
    expect(bestRecordLabel(empty)).toBe("Sem recorde registrado ainda.");
    expect(lastWeekLabel(empty)).toBe("1 check-in nos últimos 7 dias");
  });
});
