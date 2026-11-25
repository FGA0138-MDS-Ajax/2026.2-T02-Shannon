import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { SWRConfig } from "swr";
import GroupScreen from "@/app/(app)/groups/[id]/index";
import { ApiError } from "@/services/api";
import { getGroup } from "@/services/groups-api";
import type { GroupDetail } from "@/services/types/groups";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { push: jest.fn(), back: jest.fn() },
    useLocalSearchParams: () => ({ id: "g1" }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock("@/services/groups-api", () => ({ getGroup: jest.fn() }));

const mockGetGroup = getGroup as jest.MockedFunction<typeof getGroup>;

const group: GroupDetail = {
  id: "g1",
  name: "Corrida da firma",
  description: "Quem corre mais até o fim do ano",
  starts_on: "2026-11-17",
  ends_on: "2026-12-31",
  ranking_criterion: "check_ins",
  status: "active",
  members_count: 3,
  my_role: "member",
  invite_code: null,
  members: [],
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
      <GroupScreen />
    </SWRConfig>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetGroup.mockResolvedValue(group);
});

describe("GroupScreen", () => {
  it("shows the group summary from the API", async () => {
    const screen = await renderScreen();

    expect(await screen.findByText("Corrida da firma")).toBeTruthy();
    expect(screen.getByText("3 membros")).toBeTruthy();
    expect(screen.getByText("Ranking por dias com check-in")).toBeTruthy();
    expect(screen.getByText("Termina em 31/12/2026")).toBeTruthy();
    expect(screen.queryByText("Admin")).toBeNull();
    expect(mockGetGroup).toHaveBeenCalledWith("g1");
  });

  it("marks an ended group", async () => {
    mockGetGroup.mockResolvedValue({
      ...group,
      status: "ended",
      ends_on: "2026-10-31",
    });
    const screen = await renderScreen();

    expect(await screen.findByText("Encerrado")).toBeTruthy();
    expect(screen.getByText("Terminou em 31/10/2026")).toBeTruthy();
  });

  it.each([
    ["Hábitos", "/groups/g1/habits"],
    ["Feed", "/groups/g1/feed"],
    ["Ranking", "/groups/g1/ranking"],
    ["Sobre", "/groups/g1/about"],
  ])("opens %s", async (title, path) => {
    const screen = await renderScreen();

    await fireEvent.press(await screen.findByText(title));

    expect(router.push).toHaveBeenCalledWith(path);
  });

  it("explains when the group no longer exists", async () => {
    mockGetGroup.mockRejectedValue(
      new ApiError("Not found", 404, { detail: "Grupo não encontrado." }),
    );
    const screen = await renderScreen();

    expect(
      await screen.findByText(
        "Este grupo não existe mais ou você não participa dele.",
      ),
    ).toBeTruthy();

    await fireEvent.press(screen.getByText("Voltar para os grupos"));
    expect(router.back).toHaveBeenCalled();
  });
});
