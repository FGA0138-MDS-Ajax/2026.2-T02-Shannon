import { render } from "@testing-library/react-native";
import { SWRConfig } from "swr";
import HabitGoalSection from "@/components/habit-detail/habit-goal-section";
import { request } from "@/services/api";
import type { Habit } from "@/services/types/habits";

jest.mock("@/hooks/useSession", () => ({ useSession: () => ({ user: { id: "user-1" } }) }));
jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, useFocusEffect: () => {} }));
jest.mock("@/services/api", () => ({ ...jest.requireActual("@/services/api"), request: jest.fn() }));

const mockRequest = request as jest.MockedFunction<typeof request>;

const habit: Habit = {
  id: "habit-1", name: "Correr", description: null, category: "corrida", is_public: false, status: "active",
  author_user_id: null, author_group_id: "group-1", group: { id: "group-1", name: "Corrida" },
  created_at: "2026-11-01", target_end_date: null, finished_at: null,
  goal: { schedule_type: "frequency", period: "week", target_count: 3, period_end_weekday: 7, starts_on: "2026-11-01" },
};

const progress = {
  habit_id: "habit-1",
  goal: habit.goal,
  current_period: { start: "2026-11-23", end: "2026-11-29", done: 1, target_count: 3 },
  // bug L1: status vem 'ended' por engano em /goals/habits/{id}/progress
  status: "ended" as const,
  current_streak: 2, best_streak: 4, streak_started_on: null, consistent_days: 5,
};

beforeEach(() => jest.clearAllMocks());

it("contorno L1: situação correta do item do usuário em /groups/{group.id}/habits/{id}/stats", async () => {
  mockRequest.mockImplementation(async (endpoint: string) => {
    if (endpoint === "/goals/habits/habit-1/progress") return progress;
    if (endpoint === "/groups/group-1/habits/habit-1/stats") {
      return {
        as_of: "2026-11-25", habit_id: "habit-1", name: "Correr", habit_status: "active",
        members: [{ user: { id: "user-1", username: "pedro" }, progress: { ...progress, status: "in_progress" }, check_in_days: 1 }],
      };
    }
    return [];
  });

  const screen = await render(
    <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
      <HabitGoalSection habit={habit} canChangeGoal={false} />
    </SWRConfig>,
  );

  const status = await screen.findByTestId("goal-progress-status");
  // não mostra 'encerrado' incorretamente
  expect(status).toBeTruthy();
  // situação ativa não mostrada como encerrada + números preservados
  expect(screen.getByText("1 de 3")).toBeTruthy();
  expect(screen.queryByText("Sequência final")).toBeNull();
});
