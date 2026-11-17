import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import nodeFetch from "node-fetch";
import StatisticsPanel from "@/components/statistics-panel";
import SWR from "@/config/swr";
import { SessionProvider } from "@/contexts/auth-context";
import { ApiError, api, toStoredTokens } from "@/services/api";
import { createHabit, deleteHabit } from "@/services/habits-api";
import { getUserStatistics } from "@/services/statistics-api";
import {
  clearTokens,
  type StoredTokens,
  saveTokens,
} from "@/services/token-storage";
import type { HabitCreate } from "@/services/types/habits";

Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  value: nodeFetch,
  writable: true,
});

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useFocusEffect: jest.fn(),
}));

jest.mock("expo-secure-store", () => {
  const store: Record<string, string> = {};

  return {
    getItemAsync: jest.fn(async (key: string) => store[key] ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete store[key];
    }),
  };
});

async function renderStatisticsPanel() {
  return render(
    <SessionProvider>
      <SWR>
        <StatisticsPanel />
      </SWR>
    </SessionProvider>,
  );
}

let refreshToken: string | undefined;
let storedTokens: StoredTokens | undefined;
const createdHabitIds: string[] = [];

async function createTestHabit(
  name: string,
  goal: HabitCreate["goal"],
): Promise<string> {
  const habit = await createHabit({ name, category: "outros", goal });
  createdHabitIds.push(habit.id);
  return habit.id;
}

beforeAll(async () => {
  const login = process.env.TEST_API_LOGIN;
  const password = process.env.TEST_API_PASSWORD;

  if (!login || !password) {
    throw new Error("Defina TEST_API_LOGIN e TEST_API_PASSWORD para o teste.");
  }

  try {
    const tokens = await api.login({ login, password });
    storedTokens = toStoredTokens(tokens);
    refreshToken = storedTokens.refreshToken;
    await saveTokens(storedTokens);

    const initialStatistics = await getUserStatistics();
    if (
      initialStatistics.habits.total !== 0 ||
      initialStatistics.check_ins.total !== 0
    ) {
      throw new Error(
        "Use uma conta de teste sem hábitos e check-ins; o teste prepara os próprios dados.",
      );
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error(
        `Preparação do teste falhou (HTTP ${error.status}): ${error.message}`,
      );
    }
    throw error;
  }
}, 30000);

afterAll(async () => {
  try {
    for (const habitId of createdHabitIds) {
      await deleteHabit(habitId);
    }
  } finally {
    try {
      if (refreshToken) {
        await api.logout({ refresh_token: refreshToken });
      }
    } finally {
      await clearTokens();
    }
  }
}, 30000);

it("shows the empty state for a user with no habits or check-ins", async () => {
  await renderStatisticsPanel();

  await waitFor(() => {
    expect(screen.getByTestId("statistics-empty")).toBeTruthy();
  });
});

it("renders statistics and habit progress returned by the real API", async () => {
  const habitName = `Teste integração ${Date.now()}`;
  const habitId = await createTestHabit(habitName, { period: "day" });
  await renderStatisticsPanel();

  await waitFor(() => {
    expect(screen.getByTestId("statistics-content")).toBeTruthy();
    expect(screen.getByTestId(`habit-progress-${habitId}`)).toBeTruthy();
  });
});

it("highlights at-risk habits returned by the real API", async () => {
  const currentStatistics = await getUserStatistics();
  const referenceDate = new Date(
    `${currentStatistics.reference_date}T00:00:00.000Z`,
  );
  const isoWeekday = referenceDate.getUTCDay() || 7;
  const remainingDaysInWeek = 8 - isoWeekday;
  const habitName = `Risco integração ${Date.now()}`;
  const habitId = await createTestHabit(habitName, {
    period: "week",
    target_count: remainingDaysInWeek,
    period_end_weekday: 7,
  });

  const updatedStatistics = await getUserStatistics();
  expect(updatedStatistics.at_risk.habit_ids).toContain(habitId);

  await renderStatisticsPanel();
  await waitFor(() => {
    expect(screen.getByTestId("statistics-at-risk")).toBeTruthy();
    expect(screen.getByTestId(`habit-at-risk-${habitId}`)).toBeTruthy();
    expect(screen.getAllByText(habitName).length).toBeGreaterThan(0);
  });
});

it("shows an API error and recovers after retry", async () => {
  if (!storedTokens) {
    throw new Error("A sessão de teste não foi inicializada.");
  }

  await saveTokens({
    ...storedTokens,
    accessToken: "invalid-integration-access-token",
    refreshToken: "invalid-integration-refresh-token",
  });
  await renderStatisticsPanel();

  await waitFor(() => {
    expect(screen.getByTestId("statistics-error")).toBeTruthy();
  });

  await saveTokens(storedTokens);
  await fireEvent.press(screen.getByText("Tentar novamente"));

  await waitFor(() => {
    expect(screen.getByTestId("statistics-content")).toBeTruthy();
  });
});
