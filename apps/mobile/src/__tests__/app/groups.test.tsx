import { fireEvent, render, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { SWRConfig } from "swr";
import GroupsScreen from "@/app/(app)/(tabs)/groups";
import GroupDetailScreen from "@/app/(app)/groups/[id]/index";
import JoinGroupScreen from "@/app/(app)/groups/join";
import { ApiError, request } from "@/services/api";
import type {
  FeedPage,
  GroupDetail,
  GroupHabit,
  GroupHabitStatistics,
  GroupListItem,
  GroupPreview,
  GroupStatistics,
  Ranking,
} from "@/services/types/groups";
import type { HabitProgress } from "@/services/types/habits";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useLocalSearchParams: () => ({ id: "group-1" }),
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

const groups: GroupListItem[] = [
  {
    id: "group-1",
    name: "Corrida matinal",
    members_count: 3,
    my_role: "admin",
    status: "active",
    ends_on: "2026-12-11",
    ranking_criterion: "check_ins",
  },
  {
    id: "group-2",
    name: "Leitura 2025",
    members_count: 5,
    my_role: "member",
    status: "ended",
    ends_on: "2025-12-31",
    ranking_criterion: "goals",
  },
];

function makeGroup(overrides: Partial<GroupDetail> = {}): GroupDetail {
  return {
    id: "group-1",
    name: "Corrida matinal",
    description: "Correr juntos de manhã.",
    starts_on: "2026-11-01",
    ends_on: null,
    ranking_criterion: "check_ins",
    status: "active",
    members_count: 2,
    my_role: "admin",
    invite_code: "K7P4M9X2",
    members: [
      {
        user_id: "user-1",
        username: "pedro",
        role: "admin",
        joined_at: "2026-11-01T12:00:00Z",
      },
      {
        user_id: "user-2",
        username: "ana",
        role: "member",
        joined_at: "2026-11-02T12:00:00Z",
      },
    ],
    ...overrides,
  };
}

const groupHabit: GroupHabit = {
  id: "habit-1",
  name: "Correr 5 km",
  description: null,
  category: "corrida",
  is_public: false,
  status: "active",
  author_user_id: null,
  author_group_id: "group-1",
  created_at: "2026-11-01",
  target_end_date: null,
  finished_at: null,
  goal: {
    schedule_type: "frequency",
    period: "week",
    target_count: 3,
    period_end_weekday: 7,
    starts_on: "2026-11-01",
  },
  group: { id: "group-1", name: "Corrida matinal" },
};

const ranking: Ranking = {
  criterion: "check_ins",
  as_of: "2026-11-25",
  items: [
    { position: 1, user: { id: "user-2", username: "ana" }, score: 5 },
    { position: 2, user: { id: "user-1", username: "pedro" }, score: 3 },
  ],
  me: { position: 2, score: 3 },
};

const stats: GroupStatistics = {
  as_of: "2026-11-25",
  most_consistent: {
    user: { id: "user-2", username: "ana" },
    habit: { id: "habit-1", name: "Correr 5 km" },
    consistent_days: 4,
  },
  best_record: null,
  check_ins_last_7_days: 8,
};

const feed: FeedPage = {
  items: [
    {
      cursor: "c1",
      id: "check-in-1",
      author: { id: "user-2", username: "ana" },
      title: "Treino no parque",
      description: null,
      habits: [{ id: "habit-1", name: "Correr 5 km" }],
      created_at: "2026-11-25T10:00:00Z",
    },
  ],
  next_cursor: "c1",
  has_more: true,
};

function mockRoutes(routes: Record<string, unknown>) {
  mockRequest.mockImplementation(async (endpoint: string) => {
    if (endpoint in routes) {
      const value = routes[endpoint];
      if (value instanceof Error) throw value;
      return value;
    }
    throw new Error(`Rota inesperada: ${endpoint}`);
  });
}

function withSWR(children: React.ReactNode) {
  return (
    <SWRConfig
      value={{
        provider: () => new Map(),
        dedupingInterval: 0,
        shouldRetryOnError: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GroupsScreen", () => {
  it("lists active groups and filters the ended ones", async () => {
    mockRoutes({ "/groups": groups });
    const screen = await render(withSWR(<GroupsScreen />));

    expect(await screen.findByText("Corrida matinal")).toBeTruthy();
    expect(screen.queryByText("Leitura 2025")).toBeNull();

    await fireEvent.press(screen.getByTestId("filter-ended"));

    expect(screen.getByText("Leitura 2025")).toBeTruthy();
    expect(screen.queryByText("Corrida matinal")).toBeNull();
  });

  it("shows an empty state without groups", async () => {
    mockRoutes({ "/groups": [] });
    const screen = await render(withSWR(<GroupsScreen />));

    expect(await screen.findByTestId("groups-empty")).toBeTruthy();
  });

  it("opens the group when a card is pressed", async () => {
    mockRoutes({ "/groups": groups });
    const screen = await render(withSWR(<GroupsScreen />));

    await fireEvent.press(await screen.findByTestId("group-card-group-1"));

    expect(router.push).toHaveBeenCalledWith("/groups/group-1");
  });
});

function makeProgress(
  status: HabitProgress["status"],
  done: number,
): HabitProgress {
  return {
    habit_id: "habit-1",
    goal: groupHabit.goal as HabitProgress["goal"],
    current_period: {
      start: "2026-11-23",
      end: "2026-11-29",
      done,
      target_count: 3,
    },
    status,
    current_streak: 0,
    best_streak: 0,
    streak_started_on: null,
    consistent_days: 0,
  };
}

const habitStats: GroupHabitStatistics = {
  as_of: "2026-11-25",
  habit_id: "habit-1",
  name: "Correr 5 km",
  habit_status: "active",
  members: [
    {
      user: { id: "user-2", username: "ana" },
      progress: makeProgress("completed", 3),
      check_in_days: 3,
    },
    {
      user: { id: "user-1", username: "pedro" },
      progress: makeProgress("in_progress", 1),
      check_in_days: 1,
    },
  ],
};

describe("GroupDetailScreen", () => {
  const routes = {
    "/groups/group-1": makeGroup(),
    "/groups/group-1/habits?status=active": [groupHabit],
    "/groups/group-1/habits/habit-1/stats": habitStats,
    "/groups/group-1/ranking": ranking,
    "/groups/group-1/stats": stats,
    "/groups/group-1/check-ins?limit=20": feed,
  };

  it("shows the members circle and the recent check-ins", async () => {
    mockRoutes(routes);
    const screen = await render(withSWR(<GroupDetailScreen />));

    expect(await screen.findByTestId("members-circle")).toBeTruthy();
    // 1 de 2 metas cumpridas: metade do grupo
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getByText("1 de 2 metas cumpridas no grupo")).toBeTruthy();
    expect(await screen.findByText("“Treino no parque”")).toBeTruthy();
    // Legenda da roda: o próprio usuário aparece como "Você"
    expect(
      within(screen.getByTestId("circle-legend-user-1")).getByText("Você"),
    ).toBeTruthy();
  });

  it("opens the check-in details from the feed", async () => {
    mockRoutes(routes);
    const screen = await render(withSWR(<GroupDetailScreen />));

    await fireEvent.press(await screen.findByTestId("feed-item-check-in-1"));

    const sheet = within(screen.getByTestId("check-in-sheet"));
    expect(sheet.getByText("ana fez check-in em")).toBeTruthy();
    expect(sheet.getByText("3 de 3 nesta semana")).toBeTruthy();
  });

  it("shows a member's habits and checks in on your own", async () => {
    mockRoutes(routes);
    const screen = await render(withSWR(<GroupDetailScreen />));

    await fireEvent.press(await screen.findByTestId("circle-slice-user-1"));
    expect(screen.getByText("Seus hábitos")).toBeTruthy();
    expect(screen.getByText("0 cumpridas · 1 pendente")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("member-habit-habit-1"));
    expect(screen.getByText("Seu hábito")).toBeTruthy();
    expect(screen.getByTestId("member-habit-check-in")).toBeTruthy();
  });

  it("does not offer a check-in on someone else's habit", async () => {
    mockRoutes({
      ...routes,
      "/groups/group-1/check-ins?limit=20": { ...feed, items: [] },
    });
    const screen = await render(withSWR(<GroupDetailScreen />));

    await fireEvent.press(await screen.findByTestId("circle-slice-user-2"));
    await fireEvent.press(screen.getByTestId("member-habit-habit-1"));

    expect(screen.getByText("Hábito de ana")).toBeTruthy();
    expect(screen.queryByTestId("member-habit-check-in")).toBeNull();
  });

  it("loads the next feed page with the cursor", async () => {
    mockRoutes({
      ...routes,
      "/groups/group-1/check-ins?limit=20&before=c1": {
        items: [],
        next_cursor: null,
        has_more: false,
      },
    });
    const screen = await render(withSWR(<GroupDetailScreen />));

    await fireEvent.press(await screen.findByTestId("feed-load-more"));

    expect(mockRequest).toHaveBeenCalledWith(
      "/groups/group-1/check-ins?limit=20&before=c1",
    );
  });

  it("shows how many members met each habit goal", async () => {
    mockRoutes(routes);
    const screen = await render(withSWR(<GroupDetailScreen />));

    await fireEvent.press(await screen.findByTestId("group-tab-habits"));

    expect(await screen.findByTestId("group-habit-habit-1")).toBeTruthy();
    expect(screen.getByText("1 de 2 integrantes cumpriu a meta")).toBeTruthy();
    expect(screen.getByTestId("create-group-habit-button")).toBeTruthy();
    expect(screen.getByTestId("edit-group-button")).toBeTruthy();
  });

  it("shows the podium, your position and the highlights", async () => {
    mockRoutes(routes);
    const screen = await render(withSWR(<GroupDetailScreen />));

    await fireEvent.press(await screen.findByTestId("group-tab-ranking"));

    expect(await screen.findByTestId("podium-1-user-2")).toBeTruthy();
    // O próprio usuário aparece como "Você", no pódio ou na classificação
    expect(
      within(screen.getByTestId("podium-2-user-1")).getByText("Você"),
    ).toBeTruthy();
    expect(screen.getByText("4 dias em Correr 5 km")).toBeTruthy();
    // Ninguém tem recorde ainda: a API manda null
    expect(screen.getByText("Nenhuma sequência registrada")).toBeTruthy();
  });

  it("opens a member from the ranking on the overview", async () => {
    mockRoutes(routes);
    const screen = await render(withSWR(<GroupDetailScreen />));

    await fireEvent.press(await screen.findByTestId("group-tab-ranking"));
    await fireEvent.press(await screen.findByTestId("podium-1-user-2"));

    expect(await screen.findByText("Hábitos de ana")).toBeTruthy();
  });

  it("shows the invite code and the members to admins", async () => {
    mockRoutes(routes);
    const screen = await render(withSWR(<GroupDetailScreen />));

    await fireEvent.press(await screen.findByTestId("group-tab-about"));

    expect(screen.getByText("K7P4-M9X2")).toBeTruthy();
    expect(screen.getByText("ana")).toBeTruthy();
    expect(screen.getByText("Você")).toBeTruthy();
    expect(screen.getByTestId("add-member-input")).toBeTruthy();
    expect(screen.getByTestId("leave-group-button")).toBeTruthy();
  });

  it("hides admin actions from members", async () => {
    mockRoutes({
      ...routes,
      "/groups/group-1": makeGroup({ my_role: "member", invite_code: null }),
    });
    const screen = await render(withSWR(<GroupDetailScreen />));

    await fireEvent.press(await screen.findByTestId("group-tab-about"));
    expect(screen.queryByTestId("invite-card")).toBeNull();
    expect(screen.queryByTestId("add-member-input")).toBeNull();

    await fireEvent.press(screen.getByTestId("group-tab-habits"));
    expect(await screen.findByTestId("group-habit-habit-1")).toBeTruthy();
    expect(screen.queryByTestId("create-group-habit-button")).toBeNull();
    expect(screen.queryByTestId("edit-group-button")).toBeNull();
  });

  it("shows the error in the sheet and a message in the header", async () => {
    mockRoutes({
      ...routes,
      "/groups/group-1/habits?status=active": new Error("Sem conexão"),
    });
    const screen = await render(withSWR(<GroupDetailScreen />));

    expect(await screen.findByText("Não foi possível carregar")).toBeTruthy();
    expect(screen.getByText("Tentar novamente")).toBeTruthy();
    expect(screen.queryByTestId("members-circle")).toBeNull();
  });

  it("shows a message when the group does not exist", async () => {
    mockRoutes({
      "/groups/group-1": new ApiError("Não encontrado", 404, {
        detail: "Grupo inexistente ou usuário não é membro.",
      }),
      "/groups/group-1/habits?status=active": [],
    });
    const screen = await render(withSWR(<GroupDetailScreen />));

    expect(await screen.findByText("Grupo não encontrado.")).toBeTruthy();
  });
});

describe("JoinGroupScreen", () => {
  const preview: GroupPreview = {
    id: "group-1",
    name: "Corrida matinal",
    members_count: 3,
    status: "active",
  };

  it("previews the group before joining it", async () => {
    mockRequest.mockImplementation(async (endpoint: string) => {
      if (endpoint === "/groups/invite/K7P4M9X2") return preview;
      if (endpoint === "/groups/join") return makeGroup();
      throw new Error(endpoint);
    });
    const screen = await render(<JoinGroupScreen />);

    await fireEvent.changeText(
      screen.getByTestId("invite-code-input"),
      "k7p4-m9x2",
    );
    await fireEvent.press(screen.getByTestId("preview-button"));

    expect(await screen.findByText("Corrida matinal")).toBeTruthy();
    expect(screen.getByText("3/30 integrantes")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("join-button"));

    expect(mockRequest).toHaveBeenCalledWith("/groups/join", {
      method: "POST",
      body: JSON.stringify({ code: "K7P4M9X2" }),
    });
    expect(router.replace).toHaveBeenCalledWith("/groups/group-1");
  });

  it("shows the API message for an invalid code", async () => {
    mockRequest.mockRejectedValue(
      new ApiError("Código de convite inválido.", 404, {
        detail: "Código de convite inválido.",
      }),
    );
    const screen = await render(<JoinGroupScreen />);

    await fireEvent.changeText(screen.getByTestId("invite-code-input"), "XXX");
    await fireEvent.press(screen.getByTestId("preview-button"));

    expect(await screen.findByText("Código de convite inválido.")).toBeTruthy();
    expect(screen.queryByTestId("join-button")).toBeNull();
  });
});
