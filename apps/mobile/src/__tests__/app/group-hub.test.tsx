import { fireEvent, render, waitFor } from "@testing-library/react-native";
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
  name: "Movimento diário",
  description: "Um dia de cada vez.",
  starts_on: "2026-11-02",
  ends_on: null,
  ranking_criterion: "check_ins",
  status: "active",
  members_count: 4,
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

  it("shows the week with today and the day the whole group finished", async () => {
    const screen = await renderScreen();

    expect(await screen.findByText("NOVEMBRO 2026")).toBeTruthy();
    expect(screen.getByLabelText("Dia 13, hoje")).toBeTruthy();
    expect(screen.getByLabelText("Dia 9, meta coletiva completa")).toBeTruthy();
    expect(screen.getByLabelText("Dia 15")).toBeTruthy();
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

  it.each([
    ["Hábitos", "/groups/g1/habits"],
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
