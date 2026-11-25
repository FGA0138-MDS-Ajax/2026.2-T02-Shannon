import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SWRConfig } from "swr";
import EditGroupHabitScreen from "@/app/(app)/groups/[id]/habits/[habitId]/edit";
import { getGroupHabit, updateGroupHabit } from "@/services/groups-api";
import type { GroupHabit } from "@/services/types/groups";

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ id: "g1", habitId: "h1" }),
}));

jest.mock("@/services/groups-api", () => ({
  getGroupHabit: jest.fn(),
  updateGroupHabit: jest.fn(),
}));

jest.mock("@expo/ui/community/datetime-picker", () => "DateTimePicker");

const mockUpdate = updateGroupHabit as jest.MockedFunction<
  typeof updateGroupHabit
>;
const { router } = jest.requireMock("expo-router");

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
  const screen = await render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <EditGroupHabitScreen />
    </SWRConfig>,
  );
  await screen.findByDisplayValue("Pedalar");
  return screen;
}

beforeEach(() => {
  jest.clearAllMocks();
  (getGroupHabit as jest.Mock).mockResolvedValue(habit);
  mockUpdate.mockResolvedValue(habit);
});

describe("EditGroupHabitScreen", () => {
  it("has no goal and no public fields", async () => {
    const screen = await renderScreen();

    expect(screen.queryByTestId("goal-period-week")).toBeNull();
    expect(screen.queryByTestId("habit-public-switch")).toBeNull();
  });

  it("sends only the changed fields", async () => {
    const screen = await renderScreen();

    await fireEvent.changeText(
      screen.getByTestId("habit-name-input"),
      "Pedalar 10 km",
    );
    await fireEvent.press(screen.getByText("Salvar alterações"));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(mockUpdate).toHaveBeenCalledWith("g1", "h1", {
      name: "Pedalar 10 km",
    });
  });
});
