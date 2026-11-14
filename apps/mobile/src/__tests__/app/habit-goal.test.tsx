import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { SWRConfig } from "swr";
import HabitGoalScreen from "@/app/(app)/habits/[id]/goal";
import { ApiError, request } from "@/services/api";
import { setHabitGoal } from "@/services/goals-api";
import type { GoalPublic, Habit } from "@/services/types/habits";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { back: jest.fn() },
    useLocalSearchParams: () => ({ id: "habit-1" }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock("@/services/api", () => ({
  ...jest.requireActual("@/services/api"),
  request: jest.fn(),
}));

jest.mock("@/services/goals-api", () => ({
  setHabitGoal: jest.fn(),
}));

const mockRequest = request as jest.MockedFunction<typeof request>;
const mockSetHabitGoal = setHabitGoal as jest.MockedFunction<
  typeof setHabitGoal
>;
const { router } = jest.requireMock("expo-router");

const existingGoal: GoalPublic = {
  schedule_type: "frequency",
  period: "week",
  target_count: 3,
  period_end_weekday: 7,
  starts_on: "2026-11-02",
};

function makeHabit(habitGoal: GoalPublic | null = existingGoal): Habit {
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

async function renderScreen() {
  return render(
    <SWRConfig
      value={{
        provider: () => new Map(),
        dedupingInterval: 0,
        shouldRetryOnError: false,
      }}
    >
      <HabitGoalScreen />
    </SWRConfig>,
  );
}

function confirmGoalChange() {
  jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
    buttons?.find((button) => button.text === "Trocar")?.onPress?.();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockResolvedValue(makeHabit());
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("HabitGoalScreen", () => {
  it("shows a loading indicator while the habit is being fetched", async () => {
    mockRequest.mockImplementation(() => new Promise(() => {}));

    const screen = await renderScreen();

    expect(screen.getByTestId("goal-edit-loading")).toBeTruthy();
  });

  it("confirms a goal change and saves the selected goal", async () => {
    mockSetHabitGoal.mockResolvedValueOnce(existingGoal);
    const screen = await renderScreen();
    confirmGoalChange();

    await fireEvent.press(await screen.findByTestId("goal-period-month"));
    await fireEvent.press(screen.getByText("Salvar"));

    await waitFor(() => {
      expect(mockSetHabitGoal).toHaveBeenCalledWith("habit-1", {
        period: "month",
        target_count: 15,
      });
      expect(router.back).toHaveBeenCalledTimes(1);
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      "Trocar a meta",
      "Trocar a meta reinicia o streak e o recorde. Deseja continuar?",
      expect.any(Array),
      expect.any(Object),
    );
  });

  it("does not save the goal change when the user cancels", async () => {
  jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
    buttons?.find((button) => button.text === "Cancelar")?.onPress?.();
  });

  const screen = await renderScreen();

  await fireEvent.press(await screen.findByTestId("goal-period-month"));
  await fireEvent.press(screen.getByText("Salvar"));

  expect(mockSetHabitGoal).not.toHaveBeenCalled();
  expect(router.back).not.toHaveBeenCalled();

  });
  it("shows a conflict error and stays on the screen when the change is rejected", async () => {
    mockSetHabitGoal.mockRejectedValueOnce(
      new ApiError("Conflict", 409, {
        detail: "A meta não pode ser alterada neste momento.",
      }),
    );
    const screen = await renderScreen();
    confirmGoalChange();

    await fireEvent.press(await screen.findByTestId("goal-period-month"));
    await fireEvent.press(screen.getByText("Salvar"));

    expect(
      await screen.findByText("A meta não pode ser alterada neste momento."),
    ).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
  });

  it("sets a goal on a legacy habit without a confirmation warning", async () => {
    mockRequest.mockImplementation(async (path: string) => {
     if (path === "/habits/habit-1") return makeHabit(null);
      throw new Error(`Unexpected request: ${path}`);
    });
    const alertSpy = jest.spyOn(Alert, "alert");
    mockSetHabitGoal.mockResolvedValueOnce(existingGoal);
    const screen = await renderScreen();

    await fireEvent.press(await screen.findByTestId("goal-period-week"));
    await fireEvent.press(screen.getByText("Salvar"));

    await waitFor(() => {
      expect(mockSetHabitGoal).toHaveBeenCalledWith("habit-1", {
        period: "week",
        target_count: 3,
        period_end_weekday: 7,
      });
      expect(router.back).toHaveBeenCalledTimes(1);
    });
    expect(alertSpy).not.toHaveBeenCalled();
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
  });

  it("recovers the goal form after a failed habit load", async () => {
    mockRequest.mockRejectedValue(
      new ApiError("Server error" , 500, {detail: "internal"}),
    );

    const screen = await renderScreen();

    expect(
      await screen.findByText("Erro no servidor. Tente de novo em instantes."),
    ).toBeTruthy();

    mockRequest.mockResolvedValue(makeHabit());
    await fireEvent.press(screen.getByText("Tentar novamente"))

    expect(await screen.findByTestId("goal-period-week")).toBeTruthy();


  });
});
