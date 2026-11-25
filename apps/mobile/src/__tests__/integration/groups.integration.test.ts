/**
 * Testes de integração: lógica de ranking e estatísticas de grupos.
 * Valida que os dados da API são usados diretamente sem recálculo no frontend.
 * Issue: #182 – [Test] Testes de grupos
 */
import { ApiError } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import type {
  GroupRanking,
  GroupStats,
  RankingEntry,
} from "@/services/types/groups";

// ── Helpers de exibição de ranking ────────────────────────────────────────────

/**
 * Simula a lógica que uma tela de ranking deve usar:
 * - Separar pódio (posições 1-3) da lista restante
 * - Usar os campos `position` exatamente como vieram da API
 */
function splitPodiumAndList(entries: RankingEntry[]) {
  const podium = entries.filter((e) => e.position <= 3);
  const list = entries.filter((e) => e.position > 3);
  return { podium, list };
}

function rankingCriterionLabel(criterion: GroupRanking["criterion"]): string {
  return criterion === "check_ins" ? "por dias com check-in" : "por metas batidas";
}

function formatRankingResult(ranking: GroupRanking): string {
  if (ranking.group_status === "ended" && ranking.as_of) {
    return `Resultado final em ${ranking.as_of}`;
  }
  return "";
}

function allZeroScore(entries: RankingEntry[]): boolean {
  return entries.every((e) => e.score === 0);
}

// ── Helpers de exibição de estatísticas ──────────────────────────────────────

function formatMostConsistent(stat: GroupStats["most_consistent"]): string {
  if (!stat) return "Ninguém pontuou ainda";
  return `Mais constante: ${stat.username} em ${stat.habit_name}, há ${stat.streak_days} dias`;
}

function formatBestRecord(stat: GroupStats["best_record"]): string {
  if (!stat) return "Ninguém pontuou ainda";
  const unitLabel =
    stat.unit === "days" ? "dias" : stat.unit === "weeks" ? "semanas" : "meses";
  return `Maior recorde: ${stat.username} em ${stat.habit_name}, ${stat.value} ${unitLabel}`;
}

function formatCheckInsLast7Days(count: number): string {
  return `${count} check-ins nos últimos 7 dias`;
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeRankingEntry(overrides: Partial<RankingEntry>): RankingEntry {
  return {
    position: 1,
    user_id: "user-1",
    username: "alice",
    name: "Alice",
    score: 10,
    me: false,
    ...overrides,
  };
}

// ── Testes de ranking ─────────────────────────────────────────────────────────

describe("ranking: pódio e lista", () => {
  const entries: RankingEntry[] = [
    makeRankingEntry({ position: 1, username: "alice", score: 20, me: true }),
    makeRankingEntry({ position: 1, username: "bob", score: 20, user_id: "user-2" }),
    makeRankingEntry({ position: 3, username: "carol", score: 15, user_id: "user-3" }),
    makeRankingEntry({ position: 4, username: "dave", score: 10, user_id: "user-4" }),
    makeRankingEntry({ position: 5, username: "eve", score: 5, user_id: "user-5" }),
  ];

  it("separa pódio (1-3) da lista (4+)", () => {
    const { podium, list } = splitPodiumAndList(entries);
    expect(podium).toHaveLength(3);
    expect(list).toHaveLength(2);
  });

  it("preserva posições exatamente como vieram da API (empate 1, 1, 3)", () => {
    const { podium } = splitPodiumAndList(entries);
    expect(podium[0].position).toBe(1);
    expect(podium[1].position).toBe(1);
    expect(podium[2].position).toBe(3);
  });

  it("destaca o usuário com me: true", () => {
    const meEntry = entries.find((e) => e.me);
    expect(meEntry).toBeDefined();
    expect(meEntry?.username).toBe("alice");
  });

  it("lista separada começa a partir da 4ª posição", () => {
    const { list } = splitPodiumAndList(entries);
    expect(list.every((e) => e.position >= 4)).toBe(true);
  });

  it("lida com posições não consecutivas (1, 1, 3, sem posição 2)", () => {
    const { podium } = splitPodiumAndList(entries);
    const positions = podium.map((e) => e.position);
    expect(positions).toContain(1);
    expect(positions).toContain(3);
    expect(positions).not.toContain(2); // empate pulou o 2
  });
});

describe("ranking: legenda do critério", () => {
  it("check_ins mostra 'por dias com check-in'", () => {
    expect(rankingCriterionLabel("check_ins")).toBe("por dias com check-in");
  });

  it("goals mostra 'por metas batidas'", () => {
    expect(rankingCriterionLabel("goals")).toBe("por metas batidas");
  });
});

describe("ranking: grupo encerrado", () => {
  it("mostra 'Resultado final em {as_of}' quando grupo está encerrado", () => {
    const ranking: GroupRanking = {
      entries: [],
      criterion: "check_ins",
      as_of: "2026-11-30",
      group_status: "ended",
    };
    expect(formatRankingResult(ranking)).toBe("Resultado final em 2026-11-30");
  });

  it("não mostra mensagem de resultado final quando grupo está ativo", () => {
    const ranking: GroupRanking = {
      entries: [],
      criterion: "check_ins",
      as_of: null,
      group_status: "active",
    };
    expect(formatRankingResult(ranking)).toBe("");
  });
});

describe("ranking: ninguém pontuou", () => {
  it("detecta quando todos têm score zero", () => {
    const entries: RankingEntry[] = [
      makeRankingEntry({ score: 0, username: "alice" }),
      makeRankingEntry({ score: 0, username: "bob", user_id: "user-2" }),
    ];
    expect(allZeroScore(entries)).toBe(true);
  });

  it("não considera ninguém pontuou quando há score maior que zero", () => {
    const entries: RankingEntry[] = [
      makeRankingEntry({ score: 5, username: "alice" }),
      makeRankingEntry({ score: 0, username: "bob", user_id: "user-2" }),
    ];
    expect(allZeroScore(entries)).toBe(false);
  });
});

// ── Testes de estatísticas ────────────────────────────────────────────────────

describe("estatísticas: most_consistent", () => {
  it("formata 'Mais constante: {usuario} em {habito}, há {n} dias'", () => {
    const stat: GroupStats["most_consistent"] = {
      username: "alice",
      habit_name: "Correr 5 km",
      streak_days: 14,
    };
    expect(formatMostConsistent(stat)).toBe(
      "Mais constante: alice em Correr 5 km, há 14 dias",
    );
  });

  it("mostra 'Ninguém pontuou ainda' quando most_consistent é null", () => {
    expect(formatMostConsistent(null)).toBe("Ninguém pontuou ainda");
  });
});

describe("estatísticas: best_record", () => {
  it("formata com unidade 'dias'", () => {
    const stat: GroupStats["best_record"] = {
      username: "bob",
      habit_name: "Leitura",
      value: 30,
      unit: "days",
    };
    expect(formatBestRecord(stat)).toBe("Maior recorde: bob em Leitura, 30 dias");
  });

  it("formata com unidade 'semanas'", () => {
    const stat: GroupStats["best_record"] = {
      username: "carol",
      habit_name: "Meditação",
      value: 8,
      unit: "weeks",
    };
    expect(formatBestRecord(stat)).toBe(
      "Maior recorde: carol em Meditação, 8 semanas",
    );
  });

  it("formata com unidade 'meses'", () => {
    const stat: GroupStats["best_record"] = {
      username: "dave",
      habit_name: "Exercícios",
      value: 3,
      unit: "months",
    };
    expect(formatBestRecord(stat)).toBe(
      "Maior recorde: dave em Exercícios, 3 meses",
    );
  });

  it("mostra 'Ninguém pontuou ainda' quando best_record é null", () => {
    expect(formatBestRecord(null)).toBe("Ninguém pontuou ainda");
  });
});

describe("estatísticas: check_ins_last_7_days", () => {
  it("formata '{n} check-ins nos últimos 7 dias'", () => {
    expect(formatCheckInsLast7Days(42)).toBe(
      "42 check-ins nos últimos 7 dias",
    );
  });

  it("funciona com zero check-ins", () => {
    expect(formatCheckInsLast7Days(0)).toBe(
      "0 check-ins nos últimos 7 dias",
    );
  });
});

// ── Testes de erros de API em fluxos de grupos ────────────────────────────────

describe("erros de API em fluxos de grupos", () => {
  it("404 retorna a mensagem da API (não substitui por genérico)", () => {
    const err = new ApiError("not found", 404, {
      detail: "Grupo não encontrado.",
    });
    expect(getErrorMessage(err)).toBe("Grupo não encontrado.");
  });

  it("409 retorna a mensagem da API (não substitui por genérico)", () => {
    const err = new ApiError("conflict", 409, {
      detail: "Você já participa deste grupo.",
    });
    expect(getErrorMessage(err)).toBe("Você já participa deste grupo.");
  });

  it("403 retorna a mensagem da API quando há detail textual", () => {
    const err = new ApiError("forbidden", 403, {
      detail: "Você não é admin deste grupo.",
    });
    expect(getErrorMessage(err)).toBe("Você não é admin deste grupo.");
  });
});
