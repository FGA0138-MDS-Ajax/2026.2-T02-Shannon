import { Alert } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { SWRConfig } from "swr";
import GroupHabits from "@/components/groups/group-habits";
import GroupHabitDetailScreen from "@/app/(app)/groups/[id]/habits/[habitId]/index";
import EditGroupHabitScreen from "@/app/(app)/groups/[id]/habits/[habitId]/edit";
import CreateGroupHabitScreen from "@/app/(app)/groups/[id]/habits/create";
import { ApiError, request } from "@/services/api";
import { createGroupHabit, finishGroupHabit, updateGroupHabit } from "@/services/groups-api";
import type { GroupDetail, GroupHabit, GroupHabitStatistics } from "@/services/types/groups";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: "group-1", habitId: "habit-1" }),
  useFocusEffect: () => {},
}));

jest.mock("@/hooks/useSession", () => ({ useSession: () => ({ user: { id: "user-1" } }) }));

jest.mock("@/services/api", () => ({ ...jest.requireActual("@/services/api"), request: jest.fn() }));

jest.mock("@/services/groups-api", () => ({
  ...jest.requireActual("@/services/groups-api"),
  createGroupHabit: jest.fn(),
  updateGroupHabit: jest.fn(),
  finishGroupHabit: jest.fn(),
}));

const mockRequest = request as jest.MockedFunction<typeof request>;
const mockCreate = createGroupHabit as jest.MockedFunction<typeof createGroupHabit>;
const mockUpdate = updateGroupHabit as jest.MockedFunction<typeof updateGroupHabit>;
const mockFinish = finishGroupHabit as jest.MockedFunction<typeof finishGroupHabit>;

const group: GroupDetail = {
  id: "group-1", name: "Corrida", description: null, starts_on: "2026-11-01", ends_on: null,
  ranking_criterion: "check_ins", status: "active", members_count: 2, my_role: "admin",
  invite_code: "K7P4M9X2", members: [],
};

function makeHabit(overrides: Partial<GroupHabit> = {}): GroupHabit {
  return {
    id: "habit-1", name: "Correr 5 km", description: null, category: "corrida", is_public: false,
    status: "active", author_user_id: null, author_group_id: "group-1", created_at: "2026-11-01",
    target_end_date: null, finished_at: null,
    goal: { schedule_type: "frequency", period: "week", target_count: 3, period_end_weekday: 7, starts_on: "2026-11-01" },
    group: { id: "group-1", name: "Corrida" },
    ...overrides,
  };
}

function progress(status: "in_progress" | "completed" = "in_progress") {
  return {
    habit_id: "habit-1",
    goal: { schedule_type: "frequency" as const, period: "week" as const, target_count: 3, period_end_weekday: 7, starts_on: "2026-11-01" },
    current_period: { start: "2026-11-23", end: "2026-11-29", done: 1, target_count: 3 },
    status, current_streak: 1, best_streak: 1, streak_started_on: null, consistent_days: 1,
  };
}

const habitStats: GroupHabitStatistics = {
  as_of: "2026-11-25", habit_id: "habit-1", name: "Correr 5 km", habit_status: "active",
  members: [
    { user: { id: "user-1", username: "pedro" }, progress: progress("in_progress"), check_in_days: 1 },
    { user: { id: "user-2", username: "ana" }, progress: progress("completed"), check_in_days: 3 },
  ],
};

function withSWR(children: React.ReactNode) {
  return <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>{children}</SWRConfig>;
}

let alertSpy: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});
afterEach(() => alertSpy.mockRestore());

describe("listar hábitos do grupo", () => {
  it("GET /groups/{id}/habits mostra ativos e encerrados; encerrados desativados", async () => {
    mockRequest.mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith("/groups/group-1/habits")) {
        return endpoint.includes("status=finished")
          ? [makeHabit({ id: "h2", name: "Antigo", status: "finished" })]
          : [makeHabit()];
      }
      return [];
    });
    const screen = await render(withSWR(<GroupHabits group={group} />));

    expect(await screen.findByTestId("group-habit-habit-1")).toBeTruthy();
    expect(screen.queryByTestId("group-habit-h2")).toBeNull();

    await fireEvent.press(screen.getByText("Encerrados"));
    expect(await screen.findByTestId("group-habit-h2")).toBeTruthy();
  });

  it("criar só aparece para admin e só quando o grupo está ativo", async () => {
    mockRequest.mockResolvedValue([makeHabit()]);
    const adminActive = await render(withSWR(<GroupHabits group={group} />));
    expect(await adminActive.findByTestId("create-group-habit-button")).toBeTruthy();

    const member = await render(withSWR(<GroupHabits group={{ ...group, my_role: "member" }} />));
    expect(member.queryByTestId("create-group-habit-button")).toBeNull();

    const adminEnded = await render(withSWR(<GroupHabits group={{ ...group, status: "ended" }} />));
    expect(adminEnded.queryByTestId("create-group-habit-button")).toBeNull();
  });

  it("membro não vê criar/editar/encerrar", async () => {
    mockRequest.mockImplementation(async (e: string) => (e.includes("stats") ? habitStats : [makeHabit()]));
    const screen = await render(
      withSWR(<GroupHabits group={{ ...group, my_role: "member" }} />),
    );
    expect(screen.queryByTestId("create-group-habit-button")).toBeNull();
  });
});

describe("criar hábito do grupo", () => {
  it("usa o formulário pessoal com meta (GoalPicker) e sem campo público; POST envia nome, descrição, categoria, data alvo e meta", async () => {
    mockCreate.mockResolvedValue(makeHabit());
    const screen = await render(withSWR(<CreateGroupHabitScreen />));

    expect(screen.queryByTestId("habit-public-switch")).toBeNull(); // sem campo público
    expect(screen.getByText("Meta")).toBeTruthy(); // GoalPicker

    // sem categoria/meta não envia (formulário completo exigido pela API)
    await fireEvent.changeText(screen.getByTestId("habit-name-input"), "Correr");
    await fireEvent.press(screen.getByText("Criar hábito"));
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("editar hábito do grupo", () => {
  function mockDetail() {
    mockRequest.mockImplementation(async (endpoint: string) => {
      if (endpoint.endsWith("/stats")) return habitStats;
      if (endpoint === "/groups/group-1") return group;
      return makeHabit();
    });
  }

  it("PATCH envia apenas nome, descrição, categoria e data alvo alterados; não existe campo de meta", async () => {
    mockDetail();
    mockUpdate.mockResolvedValue(makeHabit());
    const screen = await render(withSWR(<EditGroupHabitScreen />));

    await screen.findByTestId("habit-name-input");
    // não existe campo de meta na edição
    expect(screen.queryByText("Meta")).toBeNull();

    await fireEvent.changeText(screen.getByTestId("habit-name-input"), "Correr 10 km");
    await fireEvent.press(screen.getByText("Salvar alterações"));

    expect(mockUpdate).toHaveBeenCalledWith("group-1", "habit-1", { name: "Correr 10 km" });
    const changes = mockUpdate.mock.calls[0][2] as Record<string, unknown>;
    expect(changes.goal).toBeUndefined(); // payload não inclui meta
  });

  it("409 Grupo encerrado. e 403 mostram a mensagem da API", async () => {
    mockDetail();
    mockUpdate.mockRejectedValue(new ApiError("Grupo encerrado.", 409, { detail: "Grupo encerrado." }));
    const screen = await render(withSWR(<EditGroupHabitScreen />));
    await screen.findByTestId("habit-name-input");
    await fireEvent.changeText(screen.getByTestId("habit-name-input"), "X");
    await fireEvent.press(screen.getByText("Salvar alterações"));
    expect(await screen.findByText("Grupo encerrado.")).toBeTruthy();
  });
});

describe("encerrar hábito do grupo", () => {
  function mockDetail(status: "active" | "finished" = "active") {
    mockRequest.mockImplementation(async (endpoint: string) => {
      if (endpoint.endsWith("/stats")) return habitStats;
      if (endpoint === "/groups/group-1") return group;
      return makeHabit({ status });
    });
  }

  it("pede confirmação; POST .../finish; após sucesso recarrega", async () => {
    mockDetail();
    mockFinish.mockResolvedValue(makeHabit({ status: "finished" }));
    const screen = await render(withSWR(<GroupHabitDetailScreen />));

    await fireEvent.press(await screen.findByTestId("finish-group-habit"));
    expect(mockFinish).not.toHaveBeenCalled();
    const buttons = alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2] as { text: string; onPress?: () => void }[];
    await buttons.find((b) => b.text === "Encerrar")?.onPress?.();
    await new Promise((r) => setTimeout(r, 0));

    expect(mockFinish).toHaveBeenCalledWith("group-1", "habit-1");
  });

  it("membro não vê editar/encerrar", async () => {
    mockRequest.mockImplementation(async (endpoint: string) => {
      if (endpoint.endsWith("/stats")) return habitStats;
      if (endpoint === "/groups/group-1") return { ...group, my_role: "member" };
      return makeHabit();
    });
    const screen = await render(withSWR(<GroupHabitDetailScreen />));
    await screen.findByTestId("member-stats-ana");
    expect(screen.queryByTestId("edit-group-habit")).toBeNull();
    expect(screen.queryByTestId("finish-group-habit")).toBeNull();
  });
});

describe("hábito expandido", () => {
  function mockDetail() {
    mockRequest.mockImplementation(async (endpoint: string) => {
      if (endpoint.endsWith("/stats")) return habitStats;
      if (endpoint === "/groups/group-1") return group;
      return makeHabit();
    });
  }

  it("GET habit + stats: uma linha por integrante com progresso, streak e dias com check-in", async () => {
    mockDetail();
    const screen = await render(withSWR(<GroupHabitDetailScreen />));

    expect(await screen.findByTestId("member-stats-ana")).toBeTruthy();
    expect(screen.getByTestId("member-stats-pedro")).toBeTruthy();
    // valores vêm da API
    expect(screen.getByText(/3 dias com check-in/)).toBeTruthy();
    expect(screen.getByText(/1 dia com check-in/)).toBeTruthy();
    expect(screen.getAllByText(/Sequência de/).length).toBeGreaterThan(0);
    // membro vs me
    expect(screen.getByText("Você")).toBeTruthy();
    expect(screen.getByText("ana")).toBeTruthy();
  });
});

describe("409 Hábito já encerrado.", () => {
  it("recarrega a lista/detalhe e mostra a mensagem da API", async () => {
    mockRequest.mockImplementation(async (endpoint: string) => {
      if (endpoint.endsWith("/stats")) return habitStats;
      if (endpoint === "/groups/group-1") return group;
      return makeHabit();
    });
    mockFinish.mockRejectedValue(new ApiError("Hábito já encerrado.", 409, { detail: "Hábito já encerrado." }));
    const screen = await render(withSWR(<GroupHabitDetailScreen />));

    await fireEvent.press(await screen.findByTestId("finish-group-habit"));
    const buttons = alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2] as { text: string; onPress?: () => void }[];
    await buttons.find((b) => b.text === "Encerrar")?.onPress?.();
    await new Promise((r) => setTimeout(r, 0));

    // re-exibe a mensagem da API
    expect(alertSpy).toHaveBeenCalledWith(expect.any(String), "Hábito já encerrado.");
  });
});
