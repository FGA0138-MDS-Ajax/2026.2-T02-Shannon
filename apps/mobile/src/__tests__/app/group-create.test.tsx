import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import CreateGroupScreen from "@/app/(app)/groups/create";
import { ApiError } from "@/services/api";
import { createGroup } from "@/services/groups-api";
import type { GroupDetail } from "@/services/types/groups";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

jest.mock("@/services/groups-api", () => ({
  ...jest.requireActual("@/services/groups-api"),
  createGroup: jest.fn(),
}));

const mockCreateGroup = createGroup as jest.MockedFunction<typeof createGroup>;

const created: GroupDetail = {
  id: "group-9",
  name: "Corrida",
  description: null,
  starts_on: "2026-11-01",
  ends_on: null,
  ranking_criterion: "check_ins",
  status: "active",
  members_count: 1,
  my_role: "admin",
  invite_code: "K7P4M9X2",
  members: [],
};

beforeEach(() => jest.clearAllMocks());

describe("CreateGroupScreen", () => {
  it("POST /groups envia os campos no formato da API e abre o grupo criado", async () => {
    mockCreateGroup.mockResolvedValue(created);
    const screen = await render(<CreateGroupScreen />);

    await fireEvent.changeText(screen.getByTestId("group-name-input"), "Corrida");
    await fireEvent.changeText(screen.getByTestId("group-description-input"), "Juntos");
    await fireEvent.press(screen.getByTestId("criterion-goals"));
    await fireEvent.press(screen.getByTestId("group-submit-button"));

    expect(mockCreateGroup).toHaveBeenCalledWith({
      name: "Corrida",
      description: "Juntos",
      ends_on: null,
      ranking_criterion: "goals",
    });
    // 201 -> abre a tela do grupo criado
    expect(router.replace).toHaveBeenCalledWith("/groups/group-9");
  });

  it("422 com lista de campos posiciona o erro no campo correto", async () => {
    mockCreateGroup.mockRejectedValue(
      new ApiError("Unprocessable", 422, {
        detail: [{ loc: ["body", "name"], msg: "Nome inválido.", type: "value_error" }],
      }),
    );
    const screen = await render(<CreateGroupScreen />);

    await fireEvent.changeText(screen.getByTestId("group-name-input"), "x");
    await fireEvent.press(screen.getByTestId("group-submit-button"));

    expect(await screen.findByText("Nome inválido.")).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("422 em texto na data de fim usa getErrorMessage no campo da data", async () => {
    const message = "A data de término deve ser igual ou posterior à data de hoje.";
    mockCreateGroup.mockRejectedValue(new ApiError(message, 422, { detail: message }));
    const screen = await render(<CreateGroupScreen />);

    await fireEvent.changeText(screen.getByTestId("group-name-input"), "Corrida");
    await fireEvent.press(screen.getByTestId("group-submit-button"));

    expect(await screen.findByText(message)).toBeTruthy();
  });
});
