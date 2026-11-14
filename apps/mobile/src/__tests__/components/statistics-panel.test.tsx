import { fireEvent, render } from "@testing-library/react-native";
import StatisticsPanel from "@/components/statistics-panel";
import { useUserStatistics } from "@/hooks/useUserStatistics";
import type { UserStatistics } from "@/services/types/statistics";

jest.mock("expo-router", () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock("@/hooks/useUserStatistics", () => ({
  ...jest.requireActual("@/hooks/useUserStatistics"),
  useUserStatistics: jest.fn(),
}));

const mockUseUserStatistics = useUserStatistics as jest.MockedFunction<
  typeof useUserStatistics
>;

const statistics = {
  habits: { total: 2, active: 2, finished: 0 },
  check_ins: { total: 5, today: 1, week: 3, month: 5 },
} as UserStatistics;

function mockHook(overrides: Partial<ReturnType<typeof useUserStatistics>>) {
  const refetch = jest.fn();
  mockUseUserStatistics.mockReturnValue({
    data: undefined,
    status: "loading",
    error: null,
    fieldErrors: {},
    refetch,
    ...overrides,
  } as ReturnType<typeof useUserStatistics>);
  return refetch;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("StatisticsPanel", () => {
  it("shows the loading state", async () => {
    mockHook({ status: "loading" });

    const screen = await render(<StatisticsPanel />);

    expect(screen.getByText("Carregando estatísticas...")).toBeTruthy();
  });

  it("shows the error and retries", async () => {
    const refetch = mockHook({ status: "error", error: "Sem conexão." });

    const screen = await render(<StatisticsPanel />);
    await fireEvent.press(screen.getByText("Tentar novamente"));

    expect(screen.getByText("Sem conexão.")).toBeTruthy();
    expect(refetch).toHaveBeenCalled();
  });

  it("shows the empty state without habits and check-ins", async () => {
    mockHook({
      status: "success",
      data: {
        ...statistics,
        habits: { total: 0, active: 0, finished: 0 },
        check_ins: { total: 0, today: 0, week: 0, month: 0 },
      },
    });

    const screen = await render(<StatisticsPanel />);

    expect(
      screen.getByText(
        "Faça seu primeiro check-in para ver suas estatísticas.",
      ),
    ).toBeTruthy();
  });

  it("shows the content when there is data", async () => {
    mockHook({ status: "success", data: statistics });

    const screen = await render(<StatisticsPanel />);

    expect(screen.getByTestId("statistics-content")).toBeTruthy();
  });

  it("does not apply days outside 1 to 365", async () => {
    mockHook({ status: "success", data: statistics });

    const screen = await render(<StatisticsPanel />);
    const input = screen.getByTestId("statistics-days-input");
    await fireEvent.changeText(input, "400");
    await fireEvent(input, "endEditing");

    expect(screen.getByText("Escolha entre 1 e 365 dias.")).toBeTruthy();
    expect(mockUseUserStatistics).toHaveBeenLastCalledWith({
      mode: "calendar",
      days: 30,
    });
  });
});
