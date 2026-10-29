import { fireEvent, render, waitFor } from "@testing-library/react-native";
import CheckInScreen from "@/app/(app)/check-in";
import { ApiError } from "@/services/api";
import type { HabitOption } from "@/services/types/habits";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { push: jest.fn() },
    // Sem navegador nos testes: "ganhar foco" vira montar a tela
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock("@/components/logout-button", () => () => null);

jest.mock("@/services/check-ins-api", () => ({
  listCheckInCategories: jest.fn(),
  listHabitOptions: jest.fn(),
  createCheckIn: jest.fn(),
}));

const api = jest.requireMock("@/services/check-ins-api");
const { router } = jest.requireMock("expo-router");

function habit(id: string, overrides: Partial<HabitOption> = {}): HabitOption {
  return {
    id,
    name: `Hábito ${id}`,
    category: "corrida",
    group: null,
    preselected: true,
    ...overrides,
  };
}

const categories = [
  { name: "corrida", habit_count: 2 },
  { name: "leitura", habit_count: 1 },
];

function isChecked(element: { props: Record<string, unknown> }) {
  const state = element.props.accessibilityState as { checked?: boolean };
  return state.checked === true;
}

async function openCorrida(items: HabitOption[]) {
  api.listCheckInCategories.mockResolvedValue({ categories });
  api.listHabitOptions.mockResolvedValueOnce({
    items,
    page: 1,
    has_more: false,
  });

  const screen = await render(<CheckInScreen />);
  await fireEvent.press(await screen.findByTestId("category-corrida"));
  await screen.findByTestId(`habit-${items[0].id}`);
  return screen;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CheckInScreen", () => {
  it("mostra o estado vazio quando não há categorias elegíveis", async () => {
    api.listCheckInCategories.mockResolvedValue({ categories: [] });

    const screen = await render(<CheckInScreen />);

    expect(await screen.findByText(/Você não tem hábitos ativos/)).toBeTruthy();
  });

  it("mostra o erro e tenta de novo", async () => {
    api.listCheckInCategories
      .mockRejectedValueOnce(new Error("rede"))
      .mockResolvedValueOnce({ categories });

    const screen = await render(<CheckInScreen />);
    await fireEvent.press(await screen.findByText("Tentar novamente"));

    expect(await screen.findByText("Corrida")).toBeTruthy();
  });

  it("abre a categoria com os hábitos pré-selecionados", async () => {
    const screen = await openCorrida([
      habit("a"),
      habit("b", { preselected: false }),
    ]);

    expect(api.listHabitOptions).toHaveBeenCalledWith({ category: "corrida" });
    expect(isChecked(screen.getByTestId("habit-a"))).toBe(true);
    expect(isChecked(screen.getByTestId("habit-b"))).toBe(false);
  });

  it("carrega outras categorias no Ver mais sem marcar", async () => {
    const screen = await openCorrida([habit("a")]);
    api.listHabitOptions.mockResolvedValueOnce({
      items: [habit("x", { category: "leitura", preselected: true })],
      page: 1,
      has_more: false,
    });

    await fireEvent.press(screen.getByTestId("see-more-button"));

    expect(api.listHabitOptions).toHaveBeenLastCalledWith({
      exclude_category: "corrida",
      page: 1,
      page_size: 3,
    });
    expect(isChecked(await screen.findByTestId("habit-x"))).toBe(false);
    // has_more = false esconde o botão
    expect(screen.queryByTestId("see-more-button")).toBeNull();
  });

  it("bloqueia a 21ª marcação", async () => {
    const items = Array.from({ length: 21 }, (_, i) =>
      habit(`h${i}`, { preselected: i < 20 }),
    );
    const screen = await openCorrida(items);

    await fireEvent.press(screen.getByTestId("habit-h20"));

    expect(isChecked(screen.getByTestId("habit-h20"))).toBe(false);
    expect(
      screen.getByText("Você pode marcar no máximo 20 hábitos."),
    ).toBeTruthy();
  });

  it("envia o check-in com a duração em ISO 8601", async () => {
    const screen = await openCorrida([habit("a"), habit("b")]);
    api.createCheckIn.mockResolvedValue({ id: "c1" });

    await fireEvent.press(screen.getByTestId("habit-b"));
    await fireEvent.press(screen.getByTestId("continue-button"));
    await fireEvent.changeText(
      screen.getByTestId("check-in-title-input"),
      " Treino ",
    );
    await fireEvent.changeText(
      screen.getByTestId("check-in-duration-input"),
      "90",
    );
    await fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/check-ins/c1"),
    );
    expect(api.createCheckIn).toHaveBeenCalledWith({
      title: "Treino",
      habit_ids: ["a"],
      duration: "PT1H30M",
    });
  });

  it("exige o título antes de enviar", async () => {
    const screen = await openCorrida([habit("a")]);

    await fireEvent.press(screen.getByTestId("continue-button"));
    await fireEvent.press(screen.getByTestId("submit-button"));

    expect(screen.getByText("Informe o título do check-in.")).toBeTruthy();
    expect(api.createCheckIn).not.toHaveBeenCalled();
  });

  it("trava o envio enquanto a requisição está em andamento", async () => {
    const screen = await openCorrida([habit("a")]);
    // Resposta controlada pelo teste, pra ver a tela no meio do envio
    let finishRequest: (value: unknown) => void = () => {};
    api.createCheckIn.mockReturnValue(
      new Promise((resolve) => {
        finishRequest = resolve;
      }),
    );

    await fireEvent.press(screen.getByTestId("continue-button"));
    await fireEvent.changeText(
      screen.getByTestId("check-in-title-input"),
      "Treino",
    );
    fireEvent.press(screen.getByTestId("submit-button"));
    expect(await screen.findByText("Enviando...")).toBeTruthy();
    fireEvent.press(screen.getByTestId("submit-button"));

    expect(api.createCheckIn).toHaveBeenCalledTimes(1);

    finishRequest({ id: "c1" });
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/check-ins/c1"),
    );
  });

  it("destaca os hábitos recusados e permite reenviar", async () => {
    const screen = await openCorrida([habit("a"), habit("b")]);
    const reason = "Hábito encerrado.";
    api.createCheckIn
      .mockRejectedValueOnce(
        new ApiError(reason, 409, { detail: reason, habit_ids: ["b"] }),
      )
      .mockResolvedValueOnce({ id: "c1" });

    await fireEvent.press(screen.getByTestId("continue-button"));
    await fireEvent.changeText(
      screen.getByTestId("check-in-title-input"),
      "Treino",
    );
    await fireEvent.press(screen.getByTestId("submit-button"));

    // Volta pra lista, com o motivo no aviso e embaixo do hábito recusado
    expect(await screen.findAllByText(reason)).toHaveLength(2);

    await fireEvent.press(screen.getByTestId("habit-b"));
    await fireEvent.press(screen.getByTestId("continue-button"));
    await fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/check-ins/c1"),
    );
    expect(api.createCheckIn).toHaveBeenLastCalledWith({
      title: "Treino",
      habit_ids: ["a"],
    });
  });
});
