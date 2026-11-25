import { render } from "@testing-library/react-native";
import { SWRConfig } from "swr";
import GroupAboutScreen from "@/app/(app)/groups/[id]/about";
import { getGroup } from "@/services/groups-api";
import type { GroupDetail } from "@/services/types/groups";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { push: jest.fn(), back: jest.fn(), dismissTo: jest.fn() },
    useLocalSearchParams: () => ({ id: "g1" }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock("@/hooks/useSession", () => ({
  useSession: () => ({ user: { id: "u-caio" } }),
}));

jest.mock("@/services/groups-api", () => ({ getGroup: jest.fn() }));

const mockGetGroup = getGroup as jest.MockedFunction<typeof getGroup>;

const aboutGroup: GroupDetail = {
  id: "g1",
  name: "Corrida da firma",
  description: "Quem corre mais até o fim do ano",
  starts_on: "2026-11-17",
  ends_on: null,
  ranking_criterion: "goals",
  status: "active",
  members_count: 2,
  my_role: "member",
  invite_code: null,
  members: [
    {
      user_id: "u-caio",
      username: "caio",
      role: "member",
      joined_at: "2026-11-17T12:05:00Z",
    },
    {
      user_id: "u-ana",
      username: "ana",
      role: "admin",
      joined_at: "2026-11-18T12:05:00Z",
    },
  ],
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
      <GroupAboutScreen />
    </SWRConfig>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetGroup.mockResolvedValue(aboutGroup);
});

describe("GroupAboutScreen", () => {
  it("shows the group details", async () => {
    const screen = await renderScreen();

    expect(await screen.findByText("Corrida da firma")).toBeTruthy();
    expect(screen.getByText("17/11/2026")).toBeTruthy();
    expect(screen.getByText("Sem data de fim")).toBeTruthy();
    expect(screen.getByText("Ranking por metas batidas")).toBeTruthy();
    expect(screen.getByText("Ativo")).toBeTruthy();
  });

  it("lists the members and marks the current user", async () => {
    const screen = await renderScreen();

    expect(await screen.findByText("Membros (2)")).toBeTruthy();
    expect(screen.getByText(/caio/)).toBeTruthy();
    expect(screen.getByText(/\(você\)/)).toBeTruthy();
    expect(screen.getByText("ana")).toBeTruthy();
    expect(screen.getByText("Entrou em 18/11/2026")).toBeTruthy();
  });
});
