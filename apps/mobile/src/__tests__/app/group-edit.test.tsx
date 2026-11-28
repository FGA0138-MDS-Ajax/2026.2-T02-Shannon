import { Alert } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { SWRConfig } from "swr";
import EditGroupScreen from "@/app/(app)/groups/[id]/edit";
import { request } from "@/services/api";
import { updateGroup } from "@/services/groups-api";
import type { GroupDetail } from "@/services/types/groups";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: "group-1" }),
}));

jest.mock("@/services/api", () => ({ ...jest.requireActual("@/services/api"), request: jest.fn() }));

jest.mock("@/services/groups-api", () => ({
  ...jest.requireActual("@/services/groups-api"),
  updateGroup: jest.fn(),
}));

const mockRequest = request as jest.MockedFunction<typeof request>;
const mockUpdate = updateGroup as jest.MockedFunction<typeof updateGroup>;

const group: GroupDetail = {
  id: "group-1", name: "Corrida", description: "Juntos", starts_on: "2026-11-01", ends_on: null,
  ranking_criterion: "check_ins", status: "active", members_count: 2, my_role: "admin",
  invite_code: "K7P4M9X2", members: [],
};

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  mockRequest.mockResolvedValue(group);
  mockUpdate.mockResolvedValue(group);
});

afterEach(() => alertSpy.mockRestore());

async function renderScreen(g: GroupDetail = group) {
  mockRequest.mockResolvedValue(g);
  const view = await render(
    <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
      <EditGroupScreen />
    </SWRConfig>,
  );
  await view.findByTestId("group-name-input");
  return view;
}

describe("Editar grupo", () => {
  it("PATCH /groups/{id} envia somente os campos alterados", async () => {
    const screen = await renderScreen();

    await fireEvent.changeText(screen.getByTestId("group-name-input"), "Corrida 2");
    await fireEvent.press(screen.getByTestId("group-submit-button"));

    expect(mockUpdate).toHaveBeenCalledWith("group-1", { name: "Corrida 2" });
    expect(router.back).toHaveBeenCalled();
  });

  it("não envia nada quando nada muda", async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByTestId("group-submit-button"));
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("tirar a data de fim envia ends_on: null", async () => {
    const screen = await renderScreen({ ...group, ends_on: "2026-12-11" });
    // remove a data
    await fireEvent.press(screen.getByText("Remover"));
    await fireEvent.press(screen.getByTestId("group-submit-button"));
    expect(mockUpdate).toHaveBeenCalledWith("group-1", { ends_on: null });
  });
});

describe("encerrar/reabrir grupo", () => {
  it("encerrar pede confirmação e envia ends_on=hoje", async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByTestId("end-group-button"));

    expect(alertSpy).toHaveBeenCalled();
    // confirma "Encerrar"
    const buttons = alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2] as { text: string; onPress?: () => void }[];
    await buttons.find((b) => b.text === "Encerrar")?.onPress?.();

    expect(mockUpdate).toHaveBeenCalledWith("group-1", { ends_on: expect.any(String) });
  });

  it("estender um grupo encerrado reabre (PATCH ends_on)", async () => {
    const screen = await renderScreen({ ...group, status: "ended", ends_on: "2020-01-01" });
    // grupo encerrado mostra "Reabrir"
    await fireEvent.press(screen.getByTestId("reopen-group-button"));
    const buttons = alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2] as { text: string; onPress?: () => void }[];
    await buttons.find((b) => b.text === "Reabrir")?.onPress?.();

    // reabrir sem data de término
    expect(mockUpdate).toHaveBeenCalledWith("group-1", { ends_on: null });
  });
});

describe("trocar critério do ranking", () => {
  it("pede confirmação pois altera a classificação de todo o grupo", async () => {
    const screen = await renderScreen();

    await fireEvent.press(screen.getByTestId("criterion-goals"));
    await fireEvent.press(screen.getByTestId("group-submit-button"));

    // nada salvo ainda
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalled();
    expect(String(alertSpy.mock.calls[alertSpy.mock.calls.length - 1][1])).toContain("classificação");

    const buttons = alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2] as { text: string; onPress?: () => void }[];
    await buttons.find((b) => b.text === "Trocar")?.onPress?.();

    expect(mockUpdate).toHaveBeenCalledWith("group-1", { ranking_criterion: "goals" });
  });

  it("cancelar a confirmação não salva", async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByTestId("criterion-goals"));
    await fireEvent.press(screen.getByTestId("group-submit-button"));
    // não confirma
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
