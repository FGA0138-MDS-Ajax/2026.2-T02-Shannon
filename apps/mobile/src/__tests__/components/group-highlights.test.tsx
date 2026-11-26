import { render } from "@testing-library/react-native";
import GroupHighlights from "@/components/groups/group-highlights";
import type { GroupStatistics } from "@/services/types/groups";

const ana = { id: "ana", username: "ana" };
const habit = { id: "h1", name: "Alongar" };

function stats(bestStreak: number): GroupStatistics {
  return {
    as_of: "2026-11-26",
    most_consistent: { user: ana, habit, consistent_days: 3 },
    best_record: { user: ana, habit, best_streak: bestStreak, unit: "day" },
    check_ins_last_7_days: 5,
  };
}

describe("GroupHighlights", () => {
  it("hides the record when it repeats the current streak", async () => {
    const screen = await render(<GroupHighlights stats={stats(3)} />);

    expect(screen.getByTestId("stat-most-consistent")).toBeTruthy();
    expect(screen.queryByTestId("stat-best-record")).toBeNull();
  });

  it("shows a record that is longer than the current streak", async () => {
    const screen = await render(<GroupHighlights stats={stats(8)} />);

    expect(screen.getByTestId("stat-best-record")).toBeTruthy();
    expect(screen.getByText("8 dias em Alongar")).toBeTruthy();
  });
});
