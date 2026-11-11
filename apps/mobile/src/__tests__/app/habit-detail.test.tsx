import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SWRConfig } from "swr";
import HabitDetailScreen from "@/app/(app)/habits/[id]";
import { ApiError, request } from "@/services/api";
import type {
  CheckIn,
  GoalPublic,
  Habit,
  HabitProgress,
} from "@/services/types/habits";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { back: jest.fn(), push: jest.fn() },
    useLocalSearchParams: () => ({ id: "habit-1" }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock("@/hooks/useSession", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/services/api", () => ({
  ...jest.requireActual("@/services/api"),
  request: jest.fn(),
}));

const mockRequest = request as jest.MockedFunction<typeof request>;

const goal: GoalPublic = {
  schedule_type: "frequency",
  period: "week",
  target_count: 3,
  period_end_weekday: 7,
  starts_on: "2026-11-02",
};

function makeHabit(habitGoal: GoalPublic | null = goal): Habit {
  return {
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
    goal: habitGoal,
  };
}

function makeProgress(): HabitProgress {
  return {
    habit_id: "habit-1",
    goal,
    current_period: {
      start: "2026-11-02",
      end: "2026-11-08",
      done: 2,
      target_count: 3,
    },
    status: "in_progress",
    current_streak: 1,
    best_streak: 2,
    streak_started_on: "2026-11-02",
    consistent_days: 2,
  };
}

async function renderScreen() {
  return render(
    <SWRConfig
      value={{
        provider: () => new Map(),
        dedupingInterval: 0,
        shouldRetryOnError: false,
      }}
    >
      <HabitDetailScreen />
    </SWRConfig>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockImplementation(async (path: string) => {
    if (path === "/habits/habit-1") return makeHabit();
    if (path === "/habits/habit-1/check-ins") return [] as CheckIn[];
    if (path === "/goals/habits/habit-1/progress") return makeProgress();
    throw new Error(`Unexpected request: ${path}`);
  });
});

describe("HabitDetailScreen", () => {
  it("shows progress and streak information for a habit with a goal", async () => {
    const screen = await renderScreen();

    expect(await screen.findByText("2 de 3")).toBeTruthy();
    expect(screen.getByText("Streak: 1 semana")).toBeTruthy();
    expect(screen.getByText("Recorde: 2 semanas")).toBeTruthy();
  });

  it("lets an old habit without a goal continue without requesting progress", async () => {
    mockRequest.mockImplementation(async (path: string) => {
      if (path === "/habits/habit-1") return makeHabit(null);
      if (path === "/habits/habit-1/check-ins") return [] as CheckIn[];
      throw new Error(`Unexpected request: ${path}`);
    });

    const screen = await renderScreen();

    expect(
      await screen.findByText("Este hábito ainda não tem meta."),
    ).toBeTruthy();
    expect(screen.getByText("Definir meta")).toBeTruthy();
    expect(mockRequest).not.toHaveBeenCalledWith(
      "/goals/habits/habit-1/progress",
    );
  });

  it("shows a loading indicator while the habit is being fetched", async () => {
    mockRequest.mockImplementation(() => new Promise(() => {}));

    const screen = await renderScreen();

    expect(screen.getByTestId("habit-detail-loading")).toBeTruthy();
  });

  it("shows a retryable error when the habit cannot be loaded", async () => {
    mockRequest.mockRejectedValue(
      new ApiError("Server error", 500, { detail: "internal" }),
    );

    const screen = await renderScreen();

    expect(
      await screen.findByText("Erro no servidor. Tente de novo em instantes."),
    ).toBeTruthy();
    expect(screen.getByText("Tentar novamente")).toBeTruthy();
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
  });

  it("loads the habit after retrying a failed request", async () => {
    mockRequest.mockRejectedValue(
      new ApiError("Server error", 500, { detail: "internal"}),
    );

    const screen = await renderScreen();

    expect(
      await screen.findByText("Erro no servidor. Tente de novo em instantes."),
    ).toBeTruthy();

    mockRequest.mockImplementation(async (path: string) => {
    if (path === "/habits/habit-1") return makeHabit();
    if (path === "/habits/habit-1/check-ins") return [] as CheckIn[];
    if (path === "/goals/habits/habit-1/progress") return makeProgress();
    throw new Error(`Unexpected request: ${path}`);
    });

    await fireEvent.press(screen.getByText("Tentar novamente"));
    expect(await screen.findByText("Correr")).toBeTruthy();

  });
});
