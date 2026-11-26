import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { completeStatistics } from "@/components/statistics/__fixtures__/statistics";
import StatisticsPanel from "@/components/statistics-panel";
import { useHabitsCheckIns } from "@/hooks/useHabitsCheckIns";
import { useUserStatistics } from "@/hooks/useUserStatistics";
import { listHabitCheckIns } from "@/services/habits-api";
import type { HabitWithProgress } from "@/services/types/habits";

// O check-in rápido busca quantos check-ins o hábito já tem
jest.mock("@/services/habits-api", () => ({
  listHabitCheckIns: jest.fn().mockResolvedValue([]),
}));

const mockListHabitCheckIns = listHabitCheckIns as jest.MockedFunction<
  typeof listHabitCheckIns
>;

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useFocusEffect: jest.fn(),
}));

jest.mock("@/hooks/useSession", () => ({
  useSession: () => ({ user: { id: "u1", name: "Breno" } }),
}));

// O histórico dos cards tem a própria busca; aqui só interessa o painel
jest.mock("@/hooks/useHabitsCheckIns", () => ({
  useHabitsCheckIns: jest.fn(),
}));

const mockUseHabitsCheckIns = useHabitsCheckIns as jest.MockedFunction<
  typeof useHabitsCheckIns
>;

function mockHistory(
  overrides: Partial<ReturnType<typeof useHabitsCheckIns>> = {},
) {
  mockUseHabitsCheckIns.mockReturnValue({
    habits: undefined,
    datesByHabit: undefined,
    categories: undefined,
    refetch: jest.fn(),
    ...overrides,
  });
}

// Hábito de grupo como vem do GET /habits, ainda por fazer hoje
const groupHabit: HabitWithProgress = {
  id: "group-habit",
  name: "Pedalar juntos",
  description: null,
  category: "ciclismo",
  is_public: false,
  status: "active",
  author_user_id: null,
  author_group_id: "g1",
  created_at: "2026-11-02",
  target_end_date: null,
  finished_at: null,
  goal: null,
  group: { id: "g1", name: "Movimento diário" },
  progress: {
    habit_id: "group-habit",
    goal: {
      schedule_type: "frequency",
      period: "day",
      target_count: 1,
      period_end_weekday: null,
      starts_on: "2026-11-02",
    },
    current_period: {
      start: completeStatistics.reference_date,
      end: completeStatistics.reference_date,
      done: 0,
      target_count: 1,
    },
    status: "ended",
    current_streak: 0,
    best_streak: 0,
    streak_started_on: null,
    consistent_days: 0,
  },
};

jest.mock("@/hooks/useUserStatistics", () => ({
  ...jest.requireActual("@/hooks/useUserStatistics"),
  useUserStatistics: jest.fn(),
}));

const mockUseUserStatistics = useUserStatistics as jest.MockedFunction<
  typeof useUserStatistics
>;

const statistics = completeStatistics;

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
  mockHistory();
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

  it("lists group habits with the group tag and opens their check-in", async () => {
    mockHook({ status: "success", data: statistics });
    mockHistory({
      habits: [groupHabit],
      categories: { "group-habit": "ciclismo" },
    });

    const screen = await render(<StatisticsPanel />);

    expect(screen.getByText("Pedalar juntos")).toBeTruthy();
    expect(
      screen.getByLabelText("Hábito do grupo Movimento diário"),
    ).toBeTruthy();
    expect(mockUseHabitsCheckIns).toHaveBeenCalledWith(expect.any(Array), "u1");

    await fireEvent.press(
      screen.getByLabelText("Fazer check-in em Pedalar juntos"),
    );

    // Abre o check-in rápido ali mesmo, sem ir para outra tela
    expect(router.push).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByTestId("quick-check-in-title").props.value).toBe(
        "Pedalar juntos #1",
      ),
    );
    expect(mockListHabitCheckIns).toHaveBeenCalledWith("group-habit");
  });

  it("shows group habits even without personal ones", async () => {
    mockHook({
      status: "success",
      data: {
        ...statistics,
        habits: { total: 0, active: 0, finished: 0 },
        check_ins: { total: 0, today: 0, week: 0, month: 0 },
        habit_progress: [],
      },
    });
    mockHistory({ habits: [groupHabit] });

    const screen = await render(<StatisticsPanel />);

    expect(screen.getByTestId("statistics-content")).toBeTruthy();
    expect(screen.getByText("Pedalar juntos")).toBeTruthy();
    expect(screen.getByText("0/1 hoje")).toBeTruthy();
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
