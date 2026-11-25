import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { SWRConfig } from "swr";
import GroupHabitsScreen from "@/app/(app)/groups/[id]/habits/index";
import { getGroup, listGroupHabits } from "@/services/groups-api";
import type { GroupDetail, GroupHabit } from "@/services/types/groups";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { push: jest.fn(), back: jest.fn() },
    useLocalSearchParams: () => ({ id: "g1" }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock("@/services/groups-api", () => ({
  getGroup: jest.fn(),
  listGroupHabits: jest.fn(),
}));

const mockGetGroup = getGroup as jest.MockedFunction<typeof getGroup>;
const mockListHabits = listGroupHabits as jest.MockedFunction<
  typeof listGroupHabits
>;

const group = {
  id: "g1",
  name: "Corrida da firma",
  status: "active",
  my_role: "admin",
} as GroupDetail;

const habit: GroupHabit = {
  id: "h1",
  name: "Pedalar",
  description: null,
  category: "ciclismo",
  is_public: false,
  status: "active",
  author_user_id: null,
  author_group_id: "g1",
  created_at: "2026-11-17",
  target_end_date: null,
  finished_at: null,
  goal: {
    schedule_type: "frequency",
    period: "week",
    target_count: 3,
    period_end_weekday: 7,
    starts_on: "2026-11-17",
  },
  group: { id: "g1", name: "Corrida da firma" },
};

async function renderScreen() {
  return render(
    <SWRConfig
      value={{
        provider: () => new Map(),
        dedupingInterval: 0,
        shouldRetryOnError: false,
      }}
    >
      <GroupHabitsScreen />
    </SWRConfig>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetGroup.mockResolvedValue(group);
  mockListHabits.mockResolvedValue([
    habit,
    { ...habit, id: "h2", name: "Ler", status: "finished" },
  ]);
});

describe("GroupHabitsScreen", () => {
  it("lists the habits with their goal", async () => {
    const screen = await renderScreen();

    expect(await screen.findByText("Pedalar")).toBeTruthy();
    expect(screen.getAllByText("3x por semana, fecha no domingo")).toHaveLength(
      2,
    );
    expect(screen.getByText("Encerrado")).toBeTruthy();
  });

  it("opens the habit", async () => {
    const screen = await renderScreen();

    await fireEvent.press(await screen.findByText("Pedalar"));

    expect(router.push).toHaveBeenCalledWith("/groups/g1/habits/h1");
  });

  it("lets only admins of active groups create habits", async () => {
    const admin = await renderScreen();
    expect(await admin.findByText("Novo hábito do grupo")).toBeTruthy();
  });

  it.each([
    ["a member", { ...group, my_role: "member" as const }],
    ["an ended group", { ...group, status: "ended" as const }],
  ])("hides the create button for %s", async (_case, current) => {
    mockGetGroup.mockResolvedValue(current);
    const screen = await renderScreen();

    await screen.findByText("Pedalar");
    expect(screen.queryByText("Novo hábito do grupo")).toBeNull();
  });
});
