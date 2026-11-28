import { fireEvent, render, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { SWRConfig } from "swr";
import GroupDetailScreen from "@/app/(app)/groups/[id]/index";
import { ApiError, request } from "@/services/api";
import type { GroupDetail } from "@/services/types/groups";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useLocalSearchParams: () => ({ id: "group-1" }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
jest.mock("@/hooks/useSession", () => ({ useSession: () => ({ user: { id: "user-1" } }) }));
jest.mock("@/services/api", () => ({ ...jest.requireActual("@/services/api"), request: jest.fn() }));

const mockRequest = request as jest.MockedFunction<typeof request>;

function makeGroup(overrides: Partial<GroupDetail> = {}): GroupDetail {
  return {
    id: "group-1", name: "Corrida matinal", description: "Correr juntos.", starts_on: "2026-11-01", ends_on: null,
    ranking_criterion: "check_ins", status: "active", members_count: 2, my_role: "admin", invite_code: "K7P4M9X2",
    members: [
      { user_id: "user-1", username: "pedro", role: "admin", joined_at: "2026-11-01T12:00:00Z" },
      { user_id: "user-2", username: "ana", role: "member", joined_at: "2026-11-02T12:00:00Z" },
    ],
    ...overrides,
  };
}

function mockRoutes(group: GroupDetail | Error) {
  mockRequest.mockImplementation(async (endpoint: string) => {
    if (endpoint === "/groups/group-1") { if (group instanceof Error) throw group; return group; }
    if (endpoint.startsWith("/groups/group-1/habits")) return [];
    if (endpoint.includes("/check-ins")) return { items: [], next_cursor: null, has_more: false };
    if (endpoint.endsWith("/ranking")) return { criterion: "check_ins", as_of: "2026-11-25", items: [], me: { position: 1, score: 0 } };
    if (endpoint.endsWith("/stats")) return { as_of: "2026-11-25", most_consistent: null, best_record: null, check_ins_last_7_days: 0 };
    return [];
  });
}

function withSWR(children: React.ReactNode) {
  return <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>{children}</SWRConfig>;
}

beforeEach(() => jest.clearAllMocks());

describe("GET /groups/{id}", () => {
  it("mostra nome, descrição, situação, critério, papel do usuário e membros", async () => {
    mockRoutes(makeGroup());
    const screen = await render(withSWR(<GroupDetailScreen />));

    expect(await screen.findByText("Corrida matinal")).toBeTruthy();
    // papel + membros na aba Sobre
    await fireEvent.press(screen.getByTestId("group-tab-about"));
    expect(screen.getAllByText(/Ativo/).length).toBeGreaterThan(0);
    expect(screen.getByText("Correr juntos.")).toBeTruthy();
    expect(screen.getByText("ana")).toBeTruthy();
    expect(screen.getByText("Admin")).toBeTruthy();
    // critério
    await fireEvent.press(screen.getByTestId("group-tab-ranking"));
    expect(screen.getByText(/Por dias com check-in/)).toBeTruthy();
  });

  it("nada de estado calculado no app: status/my_role vêm da API", async () => {
    mockRoutes(makeGroup({ status: "ended", my_role: "member", invite_code: null, ends_on: "2020-01-01" }));
    const screen = await render(withSWR(<GroupDetailScreen />));
    // mesmo com ends_on no passado, situação vem da API: 'ended'
    await fireEvent.press(await screen.findByTestId("group-tab-about"));
    expect(screen.getAllByText(/Encerrado/).length).toBeGreaterThan(0);
    // my_role member -> sem ações de admin
    expect(screen.queryByTestId("invite-card")).toBeNull();
    expect(screen.queryByTestId("add-member-input")).toBeNull();
  });

  it("botões de administração só com my_role=admin", async () => {
    mockRoutes(makeGroup({ my_role: "admin" }));
    const admin = await render(withSWR(<GroupDetailScreen />));
    expect(await admin.findByTestId("edit-group-button")).toBeTruthy();
    await fireEvent.press(admin.getByTestId("group-tab-about"));
    expect(admin.getByTestId("add-member-input")).toBeTruthy();

    mockRoutes(makeGroup({ my_role: "member", invite_code: null }));
    const member = await render(withSWR(<GroupDetailScreen />));
    expect(member.queryByTestId("edit-group-button")).toBeNull();
  });
});

describe("404 grupo inexistente", () => {
  it("mostra 'Grupo não encontrado.' e retorna para a lista", async () => {
    mockRoutes(new ApiError("Não encontrado", 404, { detail: "x" }));
    const screen = await render(withSWR(<GroupDetailScreen />));

    expect(await screen.findByText("Grupo não encontrado.")).toBeTruthy();
    expect(router.replace).toHaveBeenCalledWith("/(app)/(tabs)/groups");
  });
});
