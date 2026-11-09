import { fireEvent, render, waitFor } from "@testing-library/react-native";
import CheckInScreen from "@/app/(app)/(tabs)/check-in";
import { listUserCheckIns } from "@/services/check-ins-api";
import type { CheckIn } from "@/services/types/habits";
import { toApiDate } from "@/utils/date";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { push: jest.fn() },
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock("@/services/check-ins-api", () => ({
  listUserCheckIns: jest.fn(),
}));

const mockListUserCheckIns = listUserCheckIns as jest.MockedFunction<
  typeof listUserCheckIns
>;
const { router } = jest.requireMock("expo-router");

function makeCheckIn(id: string, overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    id,
    user_id: "user-1",
    title: `Check-in ${id}`,
    description: "Descrição do check-in",
    created_at: "2026-11-01T14:30:00Z",
    duration: "PT30M",
    habit_ids: ["habit-1"],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CheckInScreen", () => {
  it("renders screen header, calendar and check-in button", async () => {
    mockListUserCheckIns.mockResolvedValueOnce({
      items: [],
      page: 1,
      has_more: false,
    });

    const screen = await render(<CheckInScreen />);

    expect(await screen.findByText("Meus check-ins")).toBeTruthy();
    expect(screen.getByTestId("calendar-container")).toBeTruthy();
    expect(screen.getByTestId("new-check-in-button")).toBeTruthy();
  });

  it("loads check-ins and displays orange dot on days with check-ins", async () => {
    const today = toApiDate(new Date());
    mockListUserCheckIns.mockResolvedValueOnce({
      items: [
        {
          [today]: [makeCheckIn("c1", { title: "Corrida matinal" })],
        },
      ],
      page: 1,
      has_more: false,
    });

    const screen = await render(<CheckInScreen />);

    // Verifica que o ponto laranja apareceu no dia de hoje
    expect(await screen.findByTestId(`check-in-dot-${today}`)).toBeTruthy();
    // E que o check-in de hoje está listado
    expect(await screen.findByText("Corrida matinal")).toBeTruthy();
    expect(screen.getByText("30min")).toBeTruthy();
  });

  it("shows empty state when selected date has no check-ins", async () => {
    mockListUserCheckIns.mockResolvedValueOnce({
      items: [],
      page: 1,
      has_more: false,
    });

    const screen = await render(<CheckInScreen />);

    expect(await screen.findByText("Nenhum check-in neste dia")).toBeTruthy();
  });

  it("selects another date when pressed on calendar and displays its check-ins", async () => {
    const now = new Date();
    // Usa o dia 10 do mês atual
    const day10Str = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-10`;

    mockListUserCheckIns.mockResolvedValueOnce({
      items: [
        {
          [day10Str]: [makeCheckIn("c2", { title: "Leitura de livro" })],
        },
      ],
      page: 1,
      has_more: false,
    });

    const screen = await render(<CheckInScreen />);

    const day10Button = screen.getByTestId(`calendar-day-${day10Str}`);
    fireEvent.press(day10Button);

    expect(await screen.findByText("Leitura de livro")).toBeTruthy();
  });

  it("navigates to check-in detail when clicking an item", async () => {
    const today = toApiDate(new Date());
    mockListUserCheckIns.mockResolvedValueOnce({
      items: [
        {
          [today]: [makeCheckIn("check-123", { title: "Treino na academia" })],
        },
      ],
      page: 1,
      has_more: false,
    });

    const screen = await render(<CheckInScreen />);

    const item = await screen.findByTestId("check-in-item-check-123");
    fireEvent.press(item);

    expect(router.push).toHaveBeenCalledWith("/check-ins/check-123");
  });

  it("navigates to create check-in when clicking new check-in button", async () => {
    mockListUserCheckIns.mockResolvedValueOnce({
      items: [],
      page: 1,
      has_more: false,
    });

    const screen = await render(<CheckInScreen />);

    const button = screen.getByTestId("new-check-in-button");
    fireEvent.press(button);

    expect(router.push).toHaveBeenCalledWith("/check-ins/create");
  });

  it("shows error banner and retries when request fails", async () => {
    mockListUserCheckIns
      .mockRejectedValueOnce(new Error("rede"))
      .mockResolvedValueOnce({
        items: [],
        page: 1,
        has_more: false,
      });

    const screen = await render(<CheckInScreen />);

    expect(
      await screen.findByText(
        "Não foi possível conectar ao servidor. Verifique sua internet.",
      ),
    ).toBeTruthy();

    const retryButton = screen.getByText("Tentar novamente");
    fireEvent.press(retryButton);

    await waitFor(() => {
      expect(mockListUserCheckIns).toHaveBeenCalledTimes(2);
    });
  });
});
