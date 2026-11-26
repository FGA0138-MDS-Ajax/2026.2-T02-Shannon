import type { CheckIn } from "@/services/types/habits";
import { CHECK_IN_TITLE_MAX, nextCheckInTitle } from "@/utils/check-in-title";

const checkIn = (userId: string) => ({ user_id: userId }) as CheckIn;

describe("nextCheckInTitle", () => {
  it("numbers the next check-in", () => {
    expect(nextCheckInTitle("Pedalar", [], "u1")).toBe("Pedalar #1");
    expect(nextCheckInTitle("Pedalar", [checkIn("u1")], "u1")).toBe(
      "Pedalar #2",
    );
  });

  it("counts only the user's check-ins", () => {
    const checkIns = [checkIn("u1"), checkIn("u2"), checkIn("u2")];

    expect(nextCheckInTitle("Pedalar", checkIns, "u1")).toBe("Pedalar #2");
  });

  it("cuts a long name but never the number", () => {
    const title = nextCheckInTitle("a".repeat(200), [], "u1");

    expect(title).toHaveLength(CHECK_IN_TITLE_MAX);
    expect(title.endsWith(" #1")).toBe(true);
  });
});
