import type { CheckIn } from "@/services/types/habits";
import {
  isGroupDataKey,
  nextCheckInTitle,
  TITLE_MAX,
} from "@/utils/quick-check-in";

function checkIn(id: string, userId: string): CheckIn {
  return {
    id,
    user_id: userId,
    title: "Check-in",
    description: null,
    created_at: "2026-11-25T12:00:00Z",
    duration: null,
    habit_ids: ["h1"],
  };
}

describe("nextCheckInTitle", () => {
  it("numbers the next check-in of the habit", () => {
    expect(nextCheckInTitle("Pedalar", [], "u1")).toBe("Pedalar #1");
    expect(
      nextCheckInTitle(
        "Pedalar",
        [checkIn("c1", "u1"), checkIn("c2", "u1")],
        "u1",
      ),
    ).toBe("Pedalar #3");
  });

  it("counts only your own check-ins in a group habit", () => {
    const checkIns = [
      checkIn("c1", "u1"),
      checkIn("c2", "u2"),
      checkIn("c3", "u3"),
    ];

    expect(nextCheckInTitle("Pedalar", checkIns, "u1")).toBe("Pedalar #2");
  });

  it("cuts a long name but keeps the number", () => {
    const title = nextCheckInTitle("a".repeat(200), [], "u1");

    expect(title).toHaveLength(TITLE_MAX);
    expect(title.endsWith(" #1")).toBe(true);
  });
});

describe("isGroupDataKey", () => {
  it("matches the group screen keys", () => {
    expect(isGroupDataKey("/groups/g1/check-ins")).toBe(true);
    expect(isGroupDataKey(["/groups/g1/habits/stats", "h1"])).toBe(true);
    expect(isGroupDataKey("/groups")).toBe(false);
    expect(isGroupDataKey("/habits")).toBe(false);
  });
});
