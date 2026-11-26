import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { SWRConfig } from "swr";
import GroupsScreen from "@/app/(app)/(tabs)/groups";
import { ApiError } from "@/services/api";
import { listGroups } from "@/services/groups-api";
import type { GroupListItem } from "@/services/types/groups";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { push: jest.fn() },
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock("@/services/groups-api", () => ({ listGroups: jest.fn() }));

const mockListGroups = listGroups as jest.MockedFunction<typeof listGroups>;

const groups: GroupListItem[] = [
  {
    id: "g1",
    name: "Pedal de domingo",
    members_count: 4,
    my_role: "admin",
    status: "active",
    ends_on: null,
    ranking_criterion: "check_ins",
  },
  {
    id: "g2",
    name: "Leitura de outubro",
    members_count: 1,
    my_role: "member",
    status: "ended",
    ends_on: "2026-10-31",
    ranking_criterion: "goals",
  },
];

async function renderScreen() {
  return render(
    <SWRConfig
      value={{
        provider: () => new Map(),
        dedupingInterval: 0,
        shouldRetryOnError: false,
      }}
    >
      <GroupsScreen />
    </SWRConfig>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListGroups.mockResolvedValue(groups);
});

describe("GroupsScreen", () => {
  it("lists the groups as cards with members, role and status", async () => {
    const screen = await renderScreen();

    expect(await screen.findByText("Pedal de domingo")).toBeTruthy();
    expect(screen.getByText("4 membros")).toBeTruthy();
    expect(screen.getByText("Admin")).toBeTruthy();
    expect(screen.getByText("Encerrado · 1 membro")).toBeTruthy();
  });

  it("opens the group when a card is pressed", async () => {
    const screen = await renderScreen();

    await fireEvent.press(await screen.findByText("Leitura de outubro"));

    expect(router.push).toHaveBeenCalledWith("/groups/g2");
  });

  it("ends the grid with the create and join cards", async () => {
    const screen = await renderScreen();

    await fireEvent.press(await screen.findByText("Criar grupo"));
    expect(router.push).toHaveBeenCalledWith("/(app)/groups/create");

    await fireEvent.press(screen.getByText("Entrar com código"));
    expect(router.push).toHaveBeenCalledWith("/(app)/groups/join");
  });

  it("invites to create or join when there are no groups", async () => {
    mockListGroups.mockResolvedValue([]);
    const screen = await renderScreen();

    expect(await screen.findByText("Nenhum grupo por aqui")).toBeTruthy();
    expect(screen.getByText("Criar grupo")).toBeTruthy();
    expect(screen.getByText("Entrar com código")).toBeTruthy();
  });

  it("shows the error and loads again on retry", async () => {
    mockListGroups.mockRejectedValue(
      new ApiError("Server error", 500, { detail: "internal" }),
    );
    const screen = await renderScreen();

    expect(
      await screen.findByText("Erro no servidor. Tente de novo em instantes."),
    ).toBeTruthy();

    mockListGroups.mockResolvedValue(groups);
    await fireEvent.press(screen.getByText("Tentar novamente"));

    expect(await screen.findByText("Pedal de domingo")).toBeTruthy();
  });
});
