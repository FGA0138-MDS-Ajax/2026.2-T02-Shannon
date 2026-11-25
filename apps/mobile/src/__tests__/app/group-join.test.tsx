import { fireEvent, render, waitFor } from "@testing-library/react-native";
import JoinGroupScreen from "@/app/(app)/groups/join";
import { ApiError } from "@/services/api";
import { joinGroup, previewInvite } from "@/services/groups-api";
import type { GroupDetail, GroupPreview } from "@/services/types/groups";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), replace: jest.fn() },
}));

jest.mock("@/services/groups-api", () => ({
  previewInvite: jest.fn(),
  joinGroup: jest.fn(),
}));

const mockPreview = previewInvite as jest.MockedFunction<typeof previewInvite>;
const mockJoin = joinGroup as jest.MockedFunction<typeof joinGroup>;
const { router } = jest.requireMock("expo-router");

const preview: GroupPreview = {
  id: "g1",
  name: "Corrida da firma",
  members_count: 2,
  status: "active",
};

async function renderWithCode(code = " 8a7r-48gk ") {
  const screen = await render(<JoinGroupScreen />);
  await fireEvent.changeText(screen.getByTestId("invite-code-input"), code);
  return screen;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPreview.mockResolvedValue(preview);
});

describe("JoinGroupScreen", () => {
  it("previews the group and joins with the code as typed", async () => {
    mockJoin.mockResolvedValueOnce({ id: "g1" } as GroupDetail);
    const screen = await renderWithCode();

    await fireEvent.press(screen.getByText("Ver grupo"));
    expect(await screen.findByText("Corrida da firma")).toBeTruthy();
    expect(screen.getByText("2 membros")).toBeTruthy();

    await fireEvent.press(screen.getByText("Entrar no grupo"));

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/groups/g1"),
    );
    expect(mockPreview).toHaveBeenCalledWith(" 8a7r-48gk ");
    expect(mockJoin).toHaveBeenCalledWith(" 8a7r-48gk ");
  });

  it("asks for a code before searching", async () => {
    const screen = await renderWithCode("   ");

    await fireEvent.press(screen.getByText("Ver grupo"));

    expect(screen.getByText("Digite o código do convite.")).toBeTruthy();
    expect(mockPreview).not.toHaveBeenCalled();
  });

  it("shows the API message for an invalid code", async () => {
    mockPreview.mockRejectedValueOnce(
      new ApiError("Not found", 404, { detail: "Código de convite inválido." }),
    );
    const screen = await renderWithCode();

    await fireEvent.press(screen.getByText("Ver grupo"));

    expect(await screen.findByText("Código de convite inválido.")).toBeTruthy();
  });

  it("does not let anyone join an ended group", async () => {
    mockPreview.mockResolvedValueOnce({ ...preview, status: "ended" });
    const screen = await renderWithCode();

    await fireEvent.press(screen.getByText("Ver grupo"));
    await screen.findByText(
      "Este grupo já foi encerrado e não aceita novos membros.",
    );
    await fireEvent.press(screen.getByText("Entrar no grupo"));

    expect(mockJoin).not.toHaveBeenCalled();
  });

  it("opens the group when the user is already a member", async () => {
    mockJoin.mockRejectedValueOnce(
      new ApiError("Conflict", 409, {
        detail: "Você já participa deste grupo.",
      }),
    );
    const screen = await renderWithCode();

    await fireEvent.press(screen.getByText("Ver grupo"));
    await fireEvent.press(await screen.findByText("Entrar no grupo"));

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/groups/g1"),
    );
  });

  it("shows other 409 messages from the API", async () => {
    mockJoin.mockRejectedValueOnce(
      new ApiError("Conflict", 409, { detail: "Grupo cheio." }),
    );
    const screen = await renderWithCode();

    await fireEvent.press(screen.getByText("Ver grupo"));
    await fireEvent.press(await screen.findByText("Entrar no grupo"));

    expect(await screen.findByText("Grupo cheio.")).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
