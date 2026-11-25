import { fireEvent, render, waitFor } from "@testing-library/react-native";
import CreateGroupScreen from "@/app/(app)/groups/create";
import { ApiError } from "@/services/api";
import { createGroup } from "@/services/groups-api";
import type { GroupDetail } from "@/services/types/groups";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), replace: jest.fn() },
}));

jest.mock("@/services/groups-api", () => ({ createGroup: jest.fn() }));

jest.mock("@expo/ui/community/datetime-picker", () => "DateTimePicker");

const mockCreateGroup = createGroup as jest.MockedFunction<typeof createGroup>;
const { router } = jest.requireMock("expo-router");

const created: GroupDetail = {
  id: "g1",
  name: "Pedal de domingo",
  description: null,
  starts_on: "2026-11-25",
  ends_on: null,
  ranking_criterion: "goals",
  status: "active",
  members_count: 1,
  my_role: "admin",
  invite_code: "K7Q2MX9P",
  members: [],
};

async function renderFilled() {
  const screen = await render(<CreateGroupScreen />);
  await fireEvent.changeText(
    screen.getByTestId("group-name-input"),
    "  Pedal de domingo ",
  );
  await fireEvent.press(screen.getByTestId("criterion-goals"));
  return screen;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CreateGroupScreen", () => {
  it("creates the group and opens it", async () => {
    mockCreateGroup.mockResolvedValueOnce(created);
    const screen = await renderFilled();

    await fireEvent.press(screen.getByText("Criar grupo"));

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/groups/g1"),
    );
    expect(mockCreateGroup).toHaveBeenCalledWith({
      name: "Pedal de domingo",
      description: null,
      ends_on: null,
      ranking_criterion: "goals",
    });
  });

  it("asks for the name and the criterion before sending", async () => {
    const screen = await render(<CreateGroupScreen />);

    await fireEvent.press(screen.getByText("Criar grupo"));

    expect(screen.getByText("Informe o nome do grupo.")).toBeTruthy();
    expect(screen.getByText("Escolha como o ranking conta.")).toBeTruthy();
    expect(mockCreateGroup).not.toHaveBeenCalled();
  });

  it("shows a 422 field error under the field", async () => {
    mockCreateGroup.mockRejectedValueOnce(
      new ApiError("Validation", 422, {
        detail: [{ loc: ["body", "name"], msg: "Nome já usado." }],
      }),
    );
    const screen = await renderFilled();

    await fireEvent.press(screen.getByText("Criar grupo"));

    expect(await screen.findByText("Nome já usado.")).toBeTruthy();
  });

  it("shows the end date rule from a 422 text detail", async () => {
    mockCreateGroup.mockRejectedValueOnce(
      new ApiError("Validation", 422, {
        detail: "A data de fim não pode ser anterior a hoje.",
      }),
    );
    const screen = await renderFilled();

    await fireEvent.press(screen.getByText("Criar grupo"));

    expect(
      await screen.findByText("A data de fim não pode ser anterior a hoje."),
    ).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
