import { fireEvent, render } from "@testing-library/react-native";
import { SWRConfig } from "swr";
import HabitsScreen from "@/app/(app)/(tabs)/habits";
import { ApiError, request } from "@/services/api";
import type {
  GoalPublic,
  HabitProgress,
  HabitWithProgress,
} from "@/services/types/habits";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { push: jest.fn() },
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock("@/services/api", () => ({
  ...jest.requireActual("@/services/api"),
  request: jest.fn(),
}));

const mockRequest = request as jest.MockedFunction<typeof request>;

const goal: GoalPublic = {
  schedule_type: "frequency",
  period: "week",
  target_count: 4,
  period_end_weekday: 7,
  starts_on: "2026-11-02",
};

function makeProgress(): HabitProgress {
  return {
    habit_id: "habit-1",
    goal,
    current_period: {
      start: "2026-11-02",
      end: "2026-11-08",
      done: 2,
      target_count: 4,
    },
    status: "in_progress",
    current_streak: 2,
    best_streak: 3,
    streak_started_on: "2026-11-02",
    consistent_days: 2,
  };
}

const habits: HabitWithProgress[] = [
  {
    id: "habit-1",
    name: "Correr",
    description: null,
    category: "corrida",
    is_public: false,
    status: "active",
    author_user_id: "user-1",
    created_at: "2026-11-02",
    target_end_date: null,
    finished_at: null,
    goal,
    progress: makeProgress(),
  },
  {
    id: "habit-2",
    name: "Ler",
    description: null,
    category: "leitura",
    is_public: false,
    status: "active",
    author_user_id: "user-1",
    created_at: "2026-11-02",
    target_end_date: null,
    finished_at: null,
    goal: null,
    progress: null,
  },
];

async function renderScreen() {
  return render(
    <SWRConfig
      value={{
        provider: () => new Map(),
        dedupingInterval: 0,
        shouldRetryOnError: false,
      }}
    >
      <HabitsScreen />
    </SWRConfig>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockResolvedValue(habits);
});

describe("HabitsScreen", () => {
  it("shows progress and legacy habits without progress in the list", async () => {
    const screen = await renderScreen();

    expect(await screen.findByText("2/4 nesta semana")).toBeTruthy();
    expect(screen.getByText("Sem meta · toque para definir")).toBeTruthy();
    expect(screen.getByText("Correr")).toBeTruthy();
    expect(screen.getByText("Ler")).toBeTruthy();
  });

  it("shows a loading indicator while habits are being fetched", async () => {
    mockRequest.mockImplementation(() => new Promise(() => {}));

    const screen = await renderScreen();

    expect(screen.getByTestId("habits-loading")).toBeTruthy();
  });

  it("shows an error and offers a retry when the list request fails", async () => {
    mockRequest.mockRejectedValue(
      new ApiError("Server error", 500, { detail: "internal" }),
    );

    const screen = await renderScreen();

    expect(
      await screen.findByText("Erro no servidor. Tente de novo em instantes."),
    ).toBeTruthy();
    expect(screen.getByText("Tentar novamente")).toBeTruthy();
  });

  it("loads the finished habits when the finished filter is selected", async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === "/habits?status=finished") return [];
      return habits;
    });

    const screen = await renderScreen();
    await fireEvent.press(await screen.findByTestId("filter-finished"));

    expect(await screen.findByText("Nenhum hábito encerrado.")).toBeTruthy();
    expect(mockRequest).toHaveBeenCalledWith("/habits?status=finished");
  });

  it("shows an empty state when there are no active habits", async () => {
    mockRequest.mockResolvedValue([]);
    const screen = await renderScreen();

    expect(
      await screen.findByText(
        "Você ainda não tem hábitos ativos. Crie o primeiro!",
      ),
    ).toBeTruthy();
  });

  it("loads habits after retrying a failed request", async () => {
  mockRequest.mockRejectedValue(
    new ApiError("Server error", 500, { detail: "internal" }),
  );

  const screen = await renderScreen();

  expect(
    await screen.findByText("Erro no servidor. Tente de novo em instantes."),
  ).toBeTruthy();

  mockRequest.mockResolvedValue(habits);
  await fireEvent.press(screen.getByText("Tentar novamente"));

  expect(await screen.findByText("2/4 nesta semana")).toBeTruthy();
});




});
