import { fireEvent, render } from "@testing-library/react-native";
import { SWRConfig } from "swr";
import GroupDetailScreen from "@/app/(app)/groups/[id]/index";
import RankingPodium from "@/components/groups/ranking-podium";
import GroupHighlights from "@/components/groups/group-highlights";
import { request } from "@/services/api";
import type { GroupDetail, GroupStatistics, Ranking, RankingItem } from "@/services/types/groups";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useLocalSearchParams: () => ({ id: "group-1" }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
jest.mock("@/hooks/useSession", () => ({ useSession: () => ({ user: { id: "user-1" } }) }));
jest.mock("@/services/api", () => ({ ...jest.requireActual("@/services/api"), request: jest.fn() }));

const mockRequest = request as jest.MockedFunction<typeof request>;

function item(position: number, id: string, score: number): RankingItem {
  return { position, user: { id, username: id }, score };
}
const colorOf = () => "#000";

// ---------- RankingPodium ----------
describe("RankingPodium", () => {
  it("empate 1,1,3 não cria posição 2 artificial", async () => {
    const screen = await render(
      <RankingPodium
        items={[item(1, "ana", 9), item(1, "caio", 9), item(3, "bia", 4)]}
        criterion="check_ins" colorOf={colorOf} onOpenMember={jest.fn()} />,
    );
    expect(screen.getAllByText("1º").length).toBe(2);
    expect(screen.queryByText("2º")).toBeNull();
    expect(screen.getByText("3º")).toBeTruthy();
  });

  it("primeiro no centro; empates nos lugares da posição; lista a partir do 4º", async () => {
    const screen = await render(
      <RankingPodium items={[item(1, "ana", 9), item(1, "caio", 9), item(3, "bia", 4)]}
        criterion="goals" colorOf={colorOf} onOpenMember={jest.fn()} />,
    );
    // 1º no centro (slot center = items[0])
    expect(screen.getByTestId("podium-1-ana")).toBeTruthy();
    expect(screen.getByTestId("podium-1-caio")).toBeTruthy();
    expect(screen.getByTestId("podium-3-bia")).toBeTruthy();
  });

  it("destaca o usuário atual pelo campo me, não por comparação de id", async () => {
    const screen = await render(
      <RankingPodium
        items={[item(1, "ana", 9), item(2, "me-user", 5), item(3, "bia", 4)]}
        criterion="check_ins" colorOf={colorOf}
        me={{ position: 2, score: 5 }}
        onOpenMember={jest.fn()} />,
    );
    const mine = screen.getByTestId("podium-2-me-user");
    // "Você" no meu lugar (sem precisar de `userId` comparando id)
    expect(mine).toBeTruthy();
    expect(screen.getByText("Você")).toBeTruthy();
  });
});

// ---------- GroupHighlights (estatísticas) ----------
describe("GroupHighlights", () => {
  const ana = { id: "ana", username: "ana" };
  const habit = { id: "h1", name: "Correr" };
  function stats(over: Partial<GroupStatistics> = {}): GroupStatistics {
    return {
      as_of: "2026-11-26",
      most_consistent: { user: ana, habit, consistent_days: 4 },
      best_record: { user: ana, habit, best_streak: 8, unit: "day" },
      check_ins_last_7_days: 12,
      ...over,
    };
  }

  it("most_consistent: Mais constante ... em ...", async () => {
    const screen = await render(<GroupHighlights stats={stats()} />);
    expect(screen.getByTestId("stat-most-consistent")).toBeTruthy();
    expect(screen.getByText("Mais constante")).toBeTruthy();
    expect(screen.getAllByText("ana").length).toBeGreaterThan(0);
    expect(screen.getByText("4 dias em Correr")).toBeTruthy();
  });

  it("best_record usa a unidade da API (dia/dias, semana/semanas, mês/meses)", async () => {
    const day = await render(<GroupHighlights stats={stats({ best_record: { user: ana, habit, best_streak: 1, unit: "day" } })} />);
    expect(day.getByText("1 dia em Correr")).toBeTruthy();
    const days = await render(<GroupHighlights stats={stats({ best_record: { user: ana, habit, best_streak: 3, unit: "day" } })} />);
    expect(days.getByText("3 dias em Correr")).toBeTruthy();
    const week = await render(<GroupHighlights stats={stats({ best_record: { user: ana, habit, best_streak: 1, unit: "week" } })} />);
    expect(week.getByText("1 semana em Correr")).toBeTruthy();
    const weeks = await render(<GroupHighlights stats={stats({ best_record: { user: ana, habit, best_streak: 2, unit: "week" } })} />);
    expect(weeks.getByText("2 semanas em Correr")).toBeTruthy();
    const month = await render(<GroupHighlights stats={stats({ best_record: { user: ana, habit, best_streak: 1, unit: "month" } })} />);
    expect(month.getByText("1 mês em Correr")).toBeTruthy();
    const months = await render(<GroupHighlights stats={stats({ best_record: { user: ana, habit, best_streak: 5, unit: "month" } })} />);
    expect(months.getByText("5 meses em Correr")).toBeTruthy();
  });

  it("check_ins_last_7_days", async () => {
    const screen = await render(<GroupHighlights stats={stats({ check_ins_last_7_days: 9 })} />);
    expect(screen.getByTestId("stat-check-ins-7-days")).toBeTruthy();
    expect(screen.getByText("9")).toBeTruthy();
  });

  it("most_consistent: null ou best_record: null não quebra; valores nulos", async () => {
    const screen = await render(<GroupHighlights stats={stats({ most_consistent: null, best_record: null })} />);
    expect(screen.getByTestId("stat-most-consistent")).toBeTruthy();
    expect(screen.getByTestId("stat-best-record")).toBeTruthy();
  });
});

// ---------- Grupo encerrado: Resultado final em {as_of} ----------
describe("Ranking grupo encerrado", () => {
  const base: GroupDetail = {
    id: "group-1", name: "Corrida", description: null, starts_on: "2026-11-01", ends_on: "2026-11-25",
    ranking_criterion: "check_ins", status: "ended", members_count: 2, my_role: "member", invite_code: null,
    members: [{ user_id: "user-1", username: "pedro", role: "member", joined_at: "2026-11-01T12:00:00Z" }],
  };
  const ranking: Ranking = { criterion: "check_ins", as_of: "2026-11-25", items: [item(1, "user-1", 3)], me: { position: 1, score: 3 } };
  const statsData: GroupStatistics = { as_of: "2026-11-25", most_consistent: null, best_record: null, check_ins_last_7_days: 0 };

  it("grupo encerrado mostra Resultado final em {as_of}", async () => {
    mockRequest.mockImplementation(async (endpoint: string) => {
      if (endpoint === "/groups/group-1") return base;
      if (endpoint === "/groups/group-1/ranking") return ranking;
      if (endpoint === "/groups/group-1/stats") return statsData;
      if (endpoint.startsWith("/groups/group-1/habits")) return [];
      if (endpoint.includes("/check-ins")) return { items: [], next_cursor: null, has_more: false };
      return [];
    });
    const screen = await render(
      <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
        <GroupDetailScreen />
      </SWRConfig>,
    );
    await fireEvent.press(await screen.findByTestId("group-tab-ranking"));
    expect(await screen.findByText(/Resultado final em/)).toBeTruthy();
  });

  it("todos com score zero mostram Ninguém pontuou ainda", async () => {
    const zeroRanking: Ranking = { ...ranking, items: [item(1, "user-1", 0)], me: { position: 1, score: 0 } };
    mockRequest.mockImplementation(async (endpoint: string) => {
      if (endpoint === "/groups/group-1") return { ...base, status: "active" };
      if (endpoint === "/groups/group-1/ranking") return zeroRanking;
      if (endpoint === "/groups/group-1/stats") return statsData;
      if (endpoint.startsWith("/groups/group-1/habits")) return [];
      if (endpoint.includes("/check-ins")) return { items: [], next_cursor: null, has_more: false };
      return [];
    });
    const screen = await render(
      <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
        <GroupDetailScreen />
      </SWRConfig>,
    );
    await fireEvent.press(await screen.findByTestId("group-tab-ranking"));
    expect(await screen.findByText("Ninguém pontuou ainda")).toBeTruthy();
  });
});
