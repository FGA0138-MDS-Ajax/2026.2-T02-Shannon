import { render } from "@testing-library/react-native";
import { SWRConfig } from "swr";
import GroupHabitScreen from "@/app/(app)/groups/[id]/habits/[habitId]/index";
import { getGroupHabit, getGroupHabitStats } from "@/services/groups-api";
import type {
  GroupHabit,
  GroupHabitStatistics,
  MemberHabitStats,
} from "@/services/types/groups";
import type { GoalPublic } from "@/services/types/habits";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { push: jest.fn(), back: jest.fn() },
    useLocalSearchParams: () => ({ id: "g1", habitId: "h1" }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock("@/hooks/useSession", () => ({
  useSession: () => ({ user: { id: "u-ana" } }),
}));

jest.mock("@/services/groups-api", () => ({
  getGroupHabit: jest.fn(),
  getGroupHabitStats: jest.fn(),
}));

const goal: GoalPublic = {
  schedule_type: "frequency",
  period: "week",
  target_count: 3,
  period_end_weekday: 7,
  starts_on: "2026-11-17",
};

const habit: GroupHabit = {
  id: "h1",
  name: "Pedalar",
  description: "Pelo menos 10 km",
  category: "ciclismo",
  is_public: false,
  status: "active",
  author_user_id: null,
  author_group_id: "g1",
  created_at: "2026-11-17",
  target_end_date: null,
  finished_at: null,
  goal,
  group: { id: "g1", name: "Corrida da firma" },
};

function memberStats(
  id: string,
  username: string,
  done: number,
  status: MemberHabitStats["progress"]["status"],
  streak: number,
): MemberHabitStats {
  return {
    user: { id, username },
    check_in_days: done,
    progress: {
      habit_id: "h1",
      goal,
      current_period: {
        start: "2026-11-17",
        end: "2026-11-23",
        done,
        target_count: 3,
      },
      status,
      current_streak: streak,
      best_streak: streak,
      streak_started_on: null,
      consistent_days: 0,
    },
  };
}

const stats: GroupHabitStatistics = {
  as_of: "2026-11-20",
  habit_id: "h1",
  name: "Pedalar",
  habit_status: "active",
  members: [
    memberStats("u-ana", "ana", 2, "at_risk", 2),
    memberStats("u-caio", "caio", 1, "in_progress", 1),
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  (getGroupHabit as jest.Mock).mockResolvedValue(habit);
  (getGroupHabitStats as jest.Mock).mockResolvedValue(stats);
});

async function renderScreen() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <GroupHabitScreen />
    </SWRConfig>,
  );
}

describe("GroupHabitScreen", () => {
  it("shows the habit and its goal", async () => {
    const screen = await renderScreen();

    expect(await screen.findByText("Pedalar")).toBeTruthy();
    expect(screen.getByText("3x por semana, fecha no domingo")).toBeTruthy();
    expect(screen.getByText("Ciclismo")).toBeTruthy();
    expect(screen.getByText("Pelo menos 10 km")).toBeTruthy();
  });

  it("shows one row per member with the numbers from the API", async () => {
    const screen = await renderScreen();

    expect(await screen.findByTestId("member-progress-u-ana")).toBeTruthy();
    expect(screen.getByTestId("member-progress-u-caio")).toBeTruthy();
    expect(screen.getByText(/\(você\)/)).toBeTruthy();
    expect(screen.getByText("2 de 3 nesta semana")).toBeTruthy();
    expect(screen.getByText("2 semanas")).toBeTruthy();
    expect(screen.getByText("1 dia com check-in")).toBeTruthy();
  });
});
