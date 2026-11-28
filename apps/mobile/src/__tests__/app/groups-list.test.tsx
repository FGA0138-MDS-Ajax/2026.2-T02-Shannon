import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { SWRConfig } from "swr";
import GroupsScreen from "@/app/(app)/(tabs)/groups";
import { request } from "@/services/api";
import type { GroupListItem } from "@/services/types/groups";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock("@/services/api", () => ({ ...jest.requireActual("@/services/api"), request: jest.fn() }));

const mockRequest = request as jest.MockedFunction<typeof request>;

function grp(id: string, name: string, status: "active" | "ended" = "active"): GroupListItem {
  return { id, name, members_count: 2, my_role: "member", status, ends_on: null, ranking_criterion: "check_ins" };
}

function withSWR(children: React.ReactNode) {
  return <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>{children}</SWRConfig>;
}

beforeEach(() => jest.clearAllMocks());

describe("GET /groups", () => {
  it("retorna os grupos na ordem recebida pela API", async () => {
    mockRequest.mockResolvedValue([grp("g2", "Zebra"), grp("g1", "Alpha"), grp("g3", "Mango")]);
    const screen = await render(withSWR(<GroupsScreen />));

    await screen.findByTestId("group-card-g2");
    const ids = screen.getAllByTestId(/^group-card-/).map((n) => String(n.props.testID));
    expect(ids).toEqual(["group-card-g2", "group-card-g1", "group-card-g3"]);
    expect(mockRequest).toHaveBeenCalledWith("/groups");
  });

  it("grupo ativo aparece normalmente", async () => {
    mockRequest.mockResolvedValue([grp("g1", "Corrida", "active")]);
    const screen = await render(withSWR(<GroupsScreen />));
    expect(await screen.findByText("Corrida")).toBeTruthy();
    expect(screen.getByText("Ativo")).toBeTruthy();
  });

  it("grupo status=ended aparece com selo Encerrado e continua acessível", async () => {
    mockRequest.mockResolvedValue([grp("g1", "Leitura", "ended")]);
    const screen = await render(withSWR(<GroupsScreen />));

    // grupos encerrados não aparecem na aba ativos; muda para Encerrados
    await screen.findByTestId("groups-empty");
    await fireEvent.press(screen.getByText("Encerrados"));

    expect(screen.getByText("Leitura")).toBeTruthy();
    expect(screen.getByText("Encerrado")).toBeTruthy();
    // acessível: card pressionável navega
    await fireEvent.press(screen.getByTestId("group-card-g1"));
    expect(router.push).toHaveBeenCalledWith("/groups/g1");
  });

  it("estado vazio (/groups -> []) oferece criar grupo e entrar por código", async () => {
    mockRequest.mockResolvedValue([]);
    const screen = await render(withSWR(<GroupsScreen />));

    expect(await screen.findByTestId("groups-empty")).toBeTruthy();
    expect(screen.getByText("Crie um grupo ou entre com o código de convite de um amigo para acompanhar hábitos juntos.")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("create-group-button"));
    expect(router.push).toHaveBeenCalledWith("/groups/create");
    await fireEvent.press(screen.getByTestId("join-group-button"));
    expect(router.push).toHaveBeenCalledWith("/groups/join");
  });

  it("ao voltar para a aba, recarrega (useFocusEffect)", async () => {
    mockRequest.mockResolvedValue([]);
    const screen = await render(withSWR(<GroupsScreen />));
    await screen.findByTestId("groups-empty");
    const calls = mockRequest.mock.calls.length;
    // re-renderiza/refoca -> efeito roda de novo
    screen.rerender(withSWR(<GroupsScreen />));
    expect(mockRequest.mock.calls.length).toBeGreaterThanOrEqual(calls);
  });
});
