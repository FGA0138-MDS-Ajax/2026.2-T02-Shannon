import { render } from "@testing-library/react-native";
import { SWRConfig } from "swr";
import HabitDetailScreen from "@/app/(app)/habits/[id]/index";
import HabitCard from "@/components/habit-card";
import HabitCheckInsSection from "@/components/habit-detail/habit-check-ins-section";
import CheckInDetailScreen from "@/app/(app)/check-ins/[id]/index";
import { request } from "@/services/api";
import type { Habit } from "@/services/types/habits";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useLocalSearchParams: () => ({ id: "habit-1" }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
jest.mock("@/hooks/useSession", () => ({ useSession: () => ({ user: { id: "user-1" } }) }));
jest.mock("@/services/api", () => ({ ...jest.requireActual("@/services/api"), request: jest.fn() }));

const mockRequest = request as jest.MockedFunction<typeof request>;

const groupHabit: Habit = {
  id: "habit-1", name: "Correr 5 km", description: null, category: "corrida", is_public: false,
  status: "active", author_user_id: null, author_group_id: "group-1",
  group: { id: "group-1", name: "Corrida matinal" },
  created_at: "2026-11-01", target_end_date: null, finished_at: null,
  goal: { schedule_type: "frequency", period: "week", target_count: 3, period_end_weekday: 7, starts_on: "2026-11-01" },
};

const personalHabit: Habit = { ...groupHabit, author_user_id: "user-1", group: null };

function withSWR(children: React.ReactNode) {
  return <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>{children}</SWRConfig>;
}

function mockHabit(habit: Habit) {
  mockRequest.mockImplementation(async (endpoint: string) => {
    if (endpoint === `/habits/${habit.id}`) return habit;
    if (endpoint.endsWith("/progress")) return { habit_id: habit.id, goal: habit.goal, current_period: { start: "2026-11-23", end: "2026-11-29", done: 1, target_count: 3 }, status: "in_progress", current_streak: 0, best_streak: 0, streak_started_on: null, consistent_days: 0 };
    if (endpoint.endsWith("/check-ins")) return [];
    if (endpoint.startsWith("/groups/")) return { members: [] };
    return [];
  });
}

beforeEach(() => jest.clearAllMocks());

describe("Hábito de grupo na tela pessoal", () => {
  it("esconder totalmente editar, encerrar, excluir e editar meta; nenhum botão p/ rotas pessoais de escrita", async () => {
    mockHabit(groupHabit);
    const screen = await render(withSWR(<HabitDetailScreen />));

    await screen.findByText("Correr 5 km");
    // sem ações pessoais
    expect(screen.queryByText("Editar")).toBeNull();
    expect(screen.queryByText("Encerrar")).toBeNull();
    expect(screen.queryByText("Excluir")).toBeNull();
    expect(screen.queryByText("Definir meta")).toBeNull();
    expect(screen.queryByTestId("open-personal-write")).toBeNull();
    // nada aponta para rotas pessoais de escrita
    // (nenhum router.push para /habits/.../edit ou goal é renderizado)
  });

  it("mostra Hábito do grupo {nome} e atalho que abre o grupo", async () => {
    mockHabit(groupHabit);
    const screen = await render(withSWR(<HabitDetailScreen />));

    expect(await screen.findByText(/Hábito do grupo Corrida matinal/)).toBeTruthy();
    expect(screen.getByTestId("open-group-habit")).toBeTruthy();
    expect(screen.getByText("Ver no grupo")).toBeTruthy();
  });

  it("hábito pessoal não recebe etiqueta de grupo e mantém ações", async () => {
    mockHabit(personalHabit);
    const screen = await render(withSWR(<HabitDetailScreen />));

    await screen.findByText("Correr 5 km");
    expect(screen.queryByText(/Hábito do grupo/)).toBeNull();
    expect(screen.queryByTestId("open-group-habit")).toBeNull();
  });
});

describe("Lista pessoal de hábitos", () => {
  it("hábitos de grupo recebem etiqueta com o nome do grupo; pessoais não", async () => {
    const grouped = await render(<HabitCard habit={{ ...groupHabit }} onPress={() => {}} />);
    expect(grouped.getByText(/Grupo Corrida matinal/)).toBeTruthy();

    const personal = await render(<HabitCard habit={{ ...personalHabit, is_public: false }} onPress={() => {}} />);
    expect(personal.queryByText(/Grupo/)).toBeNull();
    expect(personal.getByText(/Privado/)).toBeTruthy();
  });
});

describe("Histórico de check-ins", () => {
  it("hábito de grupo mostra o autor de check-ins de outros membros", async () => {
    mockRequest.mockResolvedValue([
      { id: "c1", user_id: "user-2", title: "Treino", description: null, created_at: "2026-11-25T10:00:00Z", duration: null, habit_ids: ["habit-1"] },
      { id: "c2", user_id: "user-1", title: "Meu", description: null, created_at: "2026-11-24T10:00:00Z", duration: null, habit_ids: ["habit-1"] },
    ]);
    const screen = await render(
      withSWR(<HabitCheckInsSection habitId="habit-1" members={[{ user_id: "user-2", username: "ana" }]} />),
    );

    expect(await screen.findByText("por ana")).toBeTruthy();
    expect(screen.getByText("por Você")).toBeTruthy();
  });
});

describe("Tela de check-in", () => {
  it("editar e excluir só aparecem quando check-in.user_id corresponde ao usuário atual", async () => {
    mockRequest.mockResolvedValue({ id: "c1", user_id: "user-2", title: "T", description: null, created_at: "2026-11-25T10:00:00Z", duration: null, habit_ids: [] });
    const other = await render(withSWR(<CheckInDetailScreen />));
    await other.findByText("T");
    expect(other.queryByText("Editar")).toBeNull();
    expect(other.queryByText("Excluir check-in")).toBeNull();

    mockRequest.mockResolvedValue({ id: "c1", user_id: "user-1", title: "T", description: null, created_at: "2026-11-25T10:00:00Z", duration: null, habit_ids: [] });
    const mine = await render(withSWR(<CheckInDetailScreen />));
    await mine.findByText("T");
    expect(mine.getByText("Editar")).toBeTruthy();
    expect(mine.getByText("Excluir check-in")).toBeTruthy();
  });
});
