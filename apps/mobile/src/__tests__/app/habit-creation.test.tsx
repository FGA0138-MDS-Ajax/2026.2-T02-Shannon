import { fireEvent, render, waitFor } from "@testing-library/react-native";
import CreateHabitScreen from "@/app/(app)/habits/create";
import { ApiError } from "@/services/api";
import { createHabit } from "@/services/habits-api";
import type { Habit } from "@/services/types/habits";

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
}));

jest.mock("@/services/habits-api", () => ({
  createHabit: jest.fn(),
}));

jest.mock("@expo/ui/community/datetime-picker", () => "DateTimePicker");

const mockCreateHabit = createHabit as jest.MockedFunction<typeof createHabit>;
const { router } = jest.requireMock("expo-router");

function makeHabit(): Habit {
  return {
    id: "habit-new",
    name: "Correr",
    description: null,
    category: "corrida",
    is_public: false,
    status: "active",
    author_user_id: "user-1",
    created_at: "2026-11-10",
    target_end_date: null,
    finished_at: null,
    goal: {
      schedule_type: "frequency",
      period: "day",
      target_count: 1,
      period_end_weekday: null,
      starts_on: "2026-11-10",
    },
  };
}

async function renderScreen() {
  return render(<CreateHabitScreen />);
}

async function fillRequiredFields(
  screen: Awaited<ReturnType<typeof renderScreen>>,
) {
  await fireEvent.changeText(screen.getByTestId("habit-name-input"), "Correr");
  await fireEvent.press(screen.getByTestId("category-corrida"));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CreateHabitScreen", () => {
  it("submits a daily goal in the API contract", async () => {
    mockCreateHabit.mockResolvedValueOnce(makeHabit());
    const screen = await renderScreen();

    await fillRequiredFields(screen);
    await fireEvent.press(screen.getByTestId("goal-period-day"));
    await fireEvent.press(screen.getByText("Criar hábito"));

    await waitFor(() => {
      expect(mockCreateHabit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Correr",
          category: "corrida",
          goal: { period: "day" },
        }),
      );
      expect(router.back).toHaveBeenCalledTimes(1);
    });
  });

  it("submits a weekly goal with its default settings", async () => {
    mockCreateHabit.mockResolvedValueOnce(makeHabit());
    const screen = await renderScreen();

    await fillRequiredFields(screen);
    await fireEvent.press(screen.getByTestId("goal-period-week"));
    await fireEvent.press(screen.getByText("Criar hábito"));

    await waitFor(() => {
      expect(mockCreateHabit).toHaveBeenCalledWith(
        expect.objectContaining({
          goal: {
            period: "week",
            target_count: 3,
            period_end_weekday: 7,
          },
        }),
      );
    });
  });

  it("submits a weekly goal with a custom count and closing day", async () => {
  mockCreateHabit.mockResolvedValueOnce(makeHabit());
  const screen = await renderScreen();

  await fillRequiredFields(screen);
  await fireEvent.press(screen.getByTestId("goal-period-week"));
  await fireEvent.press(screen.getByTestId("goal-count-increase"));
  await fireEvent.press(screen.getByTestId("goal-weekday-4"));
  await fireEvent.press(screen.getByText("Criar hábito"));

  await waitFor(() => {
    expect(mockCreateHabit).toHaveBeenCalledWith(
      expect.objectContaining({
        goal: {
          period: "week",
          target_count: 4,
          period_end_weekday: 4,
        },
      }),
     );
    });
  });

  it("submits a monthly goal with its default target", async () => {
    mockCreateHabit.mockResolvedValueOnce(makeHabit());
    const screen = await renderScreen();

    await fillRequiredFields(screen);
    await fireEvent.press(screen.getByTestId("goal-period-month"));
    await fireEvent.press(screen.getByText("Criar hábito"));

    await waitFor(() => {
      expect(mockCreateHabit).toHaveBeenCalledWith(
        expect.objectContaining({
          goal: { period: "month", target_count: 15 },
        }),
      );
    });
  });

  it("shows required field errors without calling the API", async () => {
    const screen = await renderScreen();

    await fireEvent.press(screen.getByText("Criar hábito"));

    expect(screen.getByText("Informe o nome do hábito.")).toBeTruthy();
    expect(screen.getByText("Escolha uma categoria.")).toBeTruthy();
    expect(screen.getByText("Escolha o tipo da meta.")).toBeTruthy();
    expect(mockCreateHabit).not.toHaveBeenCalled();
  });

  it("shows API validation errors for goal fields", async () => {
    mockCreateHabit.mockRejectedValueOnce(
      new ApiError("Unprocessable Entity", 422, {
        detail: [
          {
            loc: ["body", "goal", "target_count"],
            msg: "Quantidade inválida.",
          },
        ],
      }),
    );
    const screen = await renderScreen();

    await fillRequiredFields(screen);
    await fireEvent.press(screen.getByTestId("goal-period-week"));
    await fireEvent.press(screen.getByText("Criar hábito"));

    expect(await screen.findByText("Quantidade inválida.")).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
  });
});
