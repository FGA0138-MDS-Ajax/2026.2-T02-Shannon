import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { SWRConfig } from "swr";
import EditGroupScreen from "@/app/(app)/groups/[id]/edit";
import { getGroup, updateGroup } from "@/services/groups-api";
import type { GroupDetail } from "@/services/types/groups";

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ id: "g1" }),
}));

jest.mock("@/services/groups-api", () => ({
  getGroup: jest.fn(),
  updateGroup: jest.fn(),
}));

jest.mock("@expo/ui/community/datetime-picker", () => "DateTimePicker");

const mockGetGroup = getGroup as jest.MockedFunction<typeof getGroup>;
const mockUpdate = updateGroup as jest.MockedFunction<typeof updateGroup>;
const { router } = jest.requireMock("expo-router");

const group: GroupDetail = {
  id: "g1",
  name: "Corrida da firma",
  description: null,
  starts_on: "2026-11-17",
  ends_on: null,
  ranking_criterion: "check_ins",
  status: "active",
  members_count: 1,
  my_role: "admin",
  invite_code: "K7Q2MX9P",
  members: [],
};

async function renderScreen() {
  const screen = await render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <EditGroupScreen />
    </SWRConfig>,
  );
  await screen.findByDisplayValue("Corrida da firma");
  return screen;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetGroup.mockResolvedValue(group);
  mockUpdate.mockResolvedValue(group);
});

describe("EditGroupScreen", () => {
  it("sends only the changed fields", async () => {
    const screen = await renderScreen();

    await fireEvent.changeText(
      screen.getByTestId("group-description-input"),
      "Até o fim do ano",
    );
    await fireEvent.press(screen.getByText("Salvar alterações"));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(mockUpdate).toHaveBeenCalledWith("g1", {
      description: "Até o fim do ano",
    });
  });

  it("goes back without a request when nothing changed", async () => {
    const screen = await renderScreen();

    await fireEvent.press(screen.getByText("Salvar alterações"));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("asks before changing the ranking criterion", async () => {
    jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => {
      buttons?.find((button) => button.text === "Cancelar")?.onPress?.();
    });
    const screen = await renderScreen();

    await fireEvent.press(screen.getByTestId("criterion-goals"));
    await fireEvent.press(screen.getByText("Salvar alterações"));

    expect(Alert.alert).toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it("changes the criterion after the confirmation", async () => {
    jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => {
      buttons?.find((button) => button.text === "Trocar")?.onPress?.();
    });
    const screen = await renderScreen();

    await fireEvent.press(screen.getByTestId("criterion-goals"));
    await fireEvent.press(screen.getByText("Salvar alterações"));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith("g1", {
        ranking_criterion: "goals",
      }),
    );
  });
});
