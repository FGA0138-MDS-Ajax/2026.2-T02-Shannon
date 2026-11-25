import { fireEvent, render, waitFor } from "@testing-library/react-native";
import CreateGroupHabitScreen from "@/app/(app)/groups/[id]/habits/create";
import { ApiError } from "@/services/api";
import { createGroupHabit } from "@/services/groups-api";
import type { GroupHabit } from "@/services/types/groups";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: "g1" }),
}));

jest.mock("@/services/groups-api", () => ({ createGroupHabit: jest.fn() }));

jest.mock("@expo/ui/community/datetime-picker", () => "DateTimePicker");

const mockCreate = createGroupHabit as jest.MockedFunction<
  typeof createGroupHabit
>;
const { router } = jest.requireMock("expo-router");

async function renderFilled() {
  const screen = await render(<CreateGroupHabitScreen />);
  await fireEvent.changeText(screen.getByTestId("habit-name-input"), "Pedalar");
  await fireEvent.press(screen.getByTestId("category-ciclismo"));
  await fireEvent.press(screen.getByTestId("goal-period-week"));
  return screen;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CreateGroupHabitScreen", () => {
  it("has no public switch", async () => {
    const screen = await render(<CreateGroupHabitScreen />);

    expect(screen.queryByTestId("habit-public-switch")).toBeNull();
  });

  it("creates the habit with its goal and opens it", async () => {
    mockCreate.mockResolvedValueOnce({ id: "h1" } as GroupHabit);
    const screen = await renderFilled();

    await fireEvent.press(screen.getByText("Criar hábito"));

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/groups/g1/habits/h1"),
    );
    const [groupId, body] = mockCreate.mock.calls[0];
    expect(groupId).toBe("g1");
    expect(body).toEqual({
      name: "Pedalar",
      category: "ciclismo",
      description: null,
      target_end_date: null,
      goal: { period: "week", target_count: 3, period_end_weekday: 7 },
    });
  });

  it("shows the API message when the group has ended", async () => {
    mockCreate.mockRejectedValueOnce(
      new ApiError("Conflict", 409, { detail: "Grupo encerrado." }),
    );
    const screen = await renderFilled();

    await fireEvent.press(screen.getByText("Criar hábito"));

    expect(await screen.findByText("Grupo encerrado.")).toBeTruthy();
  });
});
