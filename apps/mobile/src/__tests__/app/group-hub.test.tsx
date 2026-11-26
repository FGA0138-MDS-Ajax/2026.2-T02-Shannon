import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { SWRConfig } from "swr";
import GroupScreen from "@/app/(app)/groups/[id]/index";
import {
  feedGroupHabits,
  feedGroupStats,
  feedHabitStats,
  feedPage,
  feedRanking,
} from "@/components/group-feed/__fixtures__/feed";
import { ApiError } from "@/services/api";
import {
  getGroup,
  getGroupFeed,
  getGroupHabitStats,
  getGroupRanking,
  getGroupStats,
  listGroupHabits,
} from "@/services/groups-api";
import type { GroupDetail } from "@/services/types/groups";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { push: jest.fn(), back: jest.fn() },
    useLocalSearchParams: () => ({ id: "g1" }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock("@/services/groups-api", () => ({
  getGroup: jest.fn(),
  listGroupHabits: jest.fn(),
  getGroupHabitStats: jest.fn(),
  getGroupFeed: jest.fn(),
  getGroupRanking: jest.fn(),
  getGroupStats: jest.fn(),
}));

// Quem usa o app é o Breno, como no ranking dos dados falsos
jest.mock("@/hooks/useSession", () => ({
  useSession: () => ({ user: { id: "u3", username: "Breno" } }),
}));

const mockGetGroup = getGroup as jest.MockedFunction<typeof getGroup>;
const mockListGroupHabits = listGroupHabits as jest.MockedFunction<
  typeof listGroupHabits
>;
const mockGetGroupHabitStats = getGroupHabitStats as jest.MockedFunction<
  typeof getGroupHabitStats
>;
const mockGetGroupFeed = getGroupFeed as jest.MockedFunction<
  typeof getGroupFeed
>;
const mockGetGroupRanking = getGroupRanking as jest.MockedFunction<
  typeof getGroupRanking
>;
const mockGetGroupStats = getGroupStats as jest.MockedFunction<
  typeof getGroupStats
>;

const group: GroupDetail = {
  id: "g1",
  name: "Movimento diário",
  description: "Um dia de cada vez.",
  starts_on: "2026-11-02",
  ends_on: null,
  ranking_criterion: "check_ins",
  status: "active",
  members_count: 4,
  my_role: "member",
  invite_code: null,
  members: [
    { user_id: "u1", username: "Caio", role: "admin", joined_at: "2026-11-02" },
    { user_id: "u2", username: "Ana", role: "member", joined_at: "2026-11-02" },
    {
      user_id: "u3",
      username: "Breno",
      role: "member",
      joined_at: "2026-11-02",
    },
    { user_id: "u4", username: "Lu", role: "member", joined_at: "2026-11-02" },
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
      <GroupScreen />
    </SWRConfig>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetGroup.mockResolvedValue(group);
  mockListGroupHabits.mockResolvedValue(feedGroupHabits);
  mockGetGroupHabitStats.mockImplementation(async (_groupId, habitId) => {
    const stats = feedHabitStats.find((item) => item.habit_id === habitId);
    if (!stats) throw new Error(`Hábito ${habitId} sem estatísticas`);
    return stats;
  });
  mockGetGroupFeed.mockResolvedValue(feedPage);
  mockGetGroupRanking.mockResolvedValue(feedRanking);
  mockGetGroupStats.mockResolvedValue(feedGroupStats);
});

describe("GroupScreen", () => {
  it("shows the group name and the recent check-ins", async () => {
    const screen = await renderScreen();

    expect(await screen.findByText("Movimento diário")).toBeTruthy();
    // O número de pessoas já aparece na roda, não no cabeçalho
    expect(screen.queryByText(/pessoas/)).toBeNull();
    expect(screen.getByText("Check-ins recentes")).toBeTruthy();
    expect(screen.getAllByText("Caio fez check-in em")).toHaveLength(2);
    expect(screen.getAllByText("Pedalar")).toHaveLength(2);
    expect(screen.getByText("30 min de bicicleta pelo bairro.")).toBeTruthy();
    expect(screen.getByText("Beber água e Ler 10 páginas")).toBeTruthy();
    expect(mockGetGroup).toHaveBeenCalledWith("g1");
  });

  it("opens the check-in details without a new request and closes them", async () => {
    const screen = await renderScreen();
    const card = await screen.findByText("30 min de bicicleta pelo bairro.");
    const callsBefore = mockGetGroup.mock.calls.length;

    await fireEvent.press(card);

    expect(screen.getByText("CHECK-IN DO GRUPO")).toBeTruthy();
    expect(screen.getByText("Concluído")).toBeTruthy();
    expect(screen.getByText("1 / 1 dia")).toBeTruthy();
    expect(screen.getByText("Todo dia")).toBeTruthy();
    expect(screen.getByText("Ciclismo")).toBeTruthy();
    expect(
      screen.getByText(
        "Pedalei pelo bairro antes de começar o dia. Meta cumprida!",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("Registrado no grupo Movimento diário"),
    ).toBeTruthy();
    expect(mockGetGroup).toHaveBeenCalledTimes(callsBefore);

    await fireEvent.press(screen.getByLabelText("Fechar"));

    // Fecha depois da animação de descida
    await waitFor(() =>
      expect(screen.queryByText("CHECK-IN DO GRUPO")).toBeNull(),
    );
  });

  it("closes the details when tapping outside the card", async () => {
    const screen = await renderScreen();

    await fireEvent.press(
      await screen.findByText("30 min de bicicleta pelo bairro."),
    );
    await fireEvent.press(screen.getByLabelText("Fechar detalhes"));

    await waitFor(() =>
      expect(screen.queryByText("CHECK-IN DO GRUPO")).toBeNull(),
    );
  });

  it("names each habit when the check-in has more than one", async () => {
    const screen = await renderScreen();

    await fireEvent.press(
      await screen.findByText("Água e leitura antes do trabalho."),
    );

    expect(screen.getByText("Beber água · Concluído")).toBeTruthy();
    expect(screen.getByText("Ler 10 páginas · Concluído")).toBeTruthy();
    expect(screen.getAllByText("Frequência")).toHaveLength(2);
  });

  it("shows how much of today's habits the group already did", async () => {
    const screen = await renderScreen();

    expect(await screen.findByText("67%")).toBeTruthy();
    expect(
      screen.getByText("8 de 12 hábitos concluídos no grupo"),
    ).toBeTruthy();
    expect(screen.getByLabelText("Caio, 3 de 3 hábitos")).toBeTruthy();
    expect(screen.getByLabelText("Lu, 1 de 3 hábitos")).toBeTruthy();
  });

  it("shows the tab bar instead of the calendar", async () => {
    const screen = await renderScreen();

    expect(await screen.findByText("Visão geral")).toBeTruthy();
    expect(screen.getByText("Ranking")).toBeTruthy();
    expect(screen.getByText("Sobre")).toBeTruthy();
    expect(screen.getByText("Hábitos")).toBeTruthy();
    expect(screen.queryByText("NOVEMBRO 2026")).toBeNull();
  });

  it("shows the podium, your position and the group statistics", async () => {
    const screen = await renderScreen();

    await fireEvent.press(await screen.findByText("Ranking"));

    expect(screen.getByText("Ranking do grupo")).toBeTruthy();
    expect(screen.getByText("1º")).toBeTruthy();
    // Ana e Breno empatados: dois "2º" no pódio e mais um na sua linha
    expect(screen.getAllByText("2º")).toHaveLength(3);
    expect(screen.queryByText("3º")).toBeNull();
    expect(screen.getByText("por metas batidas")).toBeTruthy();
    expect(screen.getByText("Lu")).toBeTruthy();
    expect(screen.getByText("Breno · você")).toBeTruthy();
    expect(screen.getByText("Ana em Ler 10 páginas, há 12 dias")).toBeTruthy();
    expect(screen.getByText("Caio em Pedalar, 3 semanas")).toBeTruthy();
    expect(screen.getByText("23 check-ins nos últimos 7 dias")).toBeTruthy();
    expect(screen.queryByText("Check-ins recentes")).toBeNull();
  });

  it("opens a member's habits from the ranking", async () => {
    const screen = await renderScreen();

    await fireEvent.press(await screen.findByText("Ranking"));
    await fireEvent.press(screen.getByText("Lu"));

    expect(await screen.findByText("Hábitos de Lu")).toBeTruthy();
    expect(screen.getByText("1 concluído · 2 a fazer hoje")).toBeTruthy();
  });

  it("shows the group summary and opens the management screen", async () => {
    const screen = await renderScreen();

    await fireEvent.press(await screen.findByText("Sobre"));

    expect(screen.getByText("Um dia de cada vez.")).toBeTruthy();
    expect(screen.getByText("Pessoas no grupo")).toBeTruthy();
    expect(screen.getByText("Quem está nessa com você")).toBeTruthy();
    expect(screen.getByText("Caio")).toBeTruthy();

    await fireEvent.press(screen.getByText("Gerenciar grupo"));

    expect(router.push).toHaveBeenCalledWith("/groups/g1/about");
  });

  it("shows how many people finished each habit", async () => {
    const screen = await renderScreen();

    await fireEvent.press(await screen.findByText("Hábitos"));

    expect(screen.getByText("Hábitos do grupo")).toBeTruthy();
    expect(screen.getByText("12 metas individuais para hoje.")).toBeTruthy();
    expect(screen.getByText("8 de 12")).toBeTruthy();
    expect(screen.getByText("3 hábitos · Todo dia")).toBeTruthy();
    expect(screen.getByText("2/4")).toBeTruthy();
    expect(screen.getAllByText("3/4")).toHaveLength(2);

    await fireEvent.press(screen.getByText("Gerenciar hábitos"));

    expect(router.push).toHaveBeenCalledWith("/groups/g1/habits");
  });

  it("switches to a member's habits and back to the feed", async () => {
    const screen = await renderScreen();

    await fireEvent.press(await screen.findByLabelText("Ana, 2 de 3 hábitos"));

    expect(screen.getByText("Hábitos de Ana")).toBeTruthy();
    expect(screen.getByText("2 concluídos · 1 a fazer hoje")).toBeTruthy();
    expect(screen.getAllByText("Concluído hoje")).toHaveLength(2);
    expect(screen.getByText("A fazer hoje")).toBeTruthy();
    expect(screen.queryByText("Check-ins recentes")).toBeNull();

    await fireEvent.press(screen.getByText("Ver todos"));

    expect(screen.getByText("Check-ins recentes")).toBeTruthy();
  });

  it("opens the pending habit of a member", async () => {
    const screen = await renderScreen();

    await fireEvent.press(await screen.findByLabelText("Ana, 2 de 3 hábitos"));
    await fireEvent.press(screen.getByText("Pedalar"));

    expect(screen.getByText("HÁBITO DO GRUPO")).toBeTruthy();
    expect(screen.getByText("Hábito de Ana")).toBeTruthy();
    expect(screen.getAllByText("A fazer hoje")).toHaveLength(2);
    expect(screen.getByText("0 / 1 dia")).toBeTruthy();
    expect(screen.getByText("13 de novembro de 2026")).toBeTruthy();
    expect(
      screen.getByText("Compartilhado no grupo Movimento diário"),
    ).toBeTruthy();
    // O hábito é da Ana: quem usa o app não faz check-in por ela
    expect(screen.queryByText("Fazer check-in")).toBeNull();
  });

  it("opens the check-in from your own pending habit", async () => {
    const screen = await renderScreen();

    await fireEvent.press(
      await screen.findByLabelText("Breno, 2 de 3 hábitos"),
    );
    await fireEvent.press(screen.getByText("Pedalar"));
    await fireEvent.press(screen.getByText("Fazer check-in"));

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/check-ins/create",
      params: { habitId: "h1", category: "ciclismo" },
    });
  });

  it("opens the check-in behind a habit the member already did", async () => {
    const screen = await renderScreen();

    await fireEvent.press(await screen.findByLabelText("Ana, 2 de 3 hábitos"));
    await fireEvent.press(screen.getByText("Beber água"));

    expect(screen.getByText("CHECK-IN DO GRUPO")).toBeTruthy();
    expect(screen.getByText("Meta do dia: 2 litros de água.")).toBeTruthy();
  });

  it("hides the description block when the check-in has none", async () => {
    const screen = await renderScreen();

    await fireEvent.press(
      await screen.findByText("Meta do dia: 2 litros de água."),
    );

    expect(screen.getByText("CHECK-IN DO GRUPO")).toBeTruthy();
    expect(screen.queryByText("Sobre este check-in")).toBeNull();
  });

  it("loads every screen part from the API", async () => {
    await renderScreen();

    await waitFor(() =>
      expect(mockGetGroupHabitStats).toHaveBeenCalledTimes(3),
    );
    expect(mockListGroupHabits).toHaveBeenCalledWith("g1");
    expect(mockGetGroupHabitStats).toHaveBeenCalledWith("g1", "h1");
    expect(mockGetGroupFeed).toHaveBeenCalledWith("g1");
    expect(mockGetGroupRanking).toHaveBeenCalledWith("g1");
    expect(mockGetGroupStats).toHaveBeenCalledWith("g1");
  });

  it("invites the first check-in when the feed is empty", async () => {
    mockGetGroupFeed.mockResolvedValue({
      items: [],
      next_cursor: null,
      has_more: false,
    });
    const screen = await renderScreen();

    expect(
      await screen.findByText(
        "Ninguém fez check-in ainda. O primeiro pode ser o seu.",
      ),
    ).toBeTruthy();
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
