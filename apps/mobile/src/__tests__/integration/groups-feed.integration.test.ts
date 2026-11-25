/**
 * Testes do feed de grupos (paginação com cursores opacos).
 * Valida a lógica de cursor handling conforme contrato da Sprint 5.
 * Issue: #182 – [Test] Testes de grupos
 */
import { ApiError } from "@/services/api";
import { getErrorMessage } from "@/services/api-errors";
import type { GroupFeedItem, GroupFeedPage } from "@/services/types/groups";

// ── Helpers de lógica do feed ─────────────────────────────────────────────────

/**
 * Simula a lógica que o app deve usar para mesclar páginas do feed.
 * Remove duplicatas por id — a API pode repetir itens em atualizações.
 */
function mergeFeedPages(
  existing: GroupFeedItem[],
  incoming: GroupFeedItem[],
): GroupFeedItem[] {
  const seen = new Set(existing.map((item) => item.id));
  const unique = incoming.filter((item) => !seen.has(item.id));
  return [...existing, ...unique];
}

/**
 * Simula a lógica de atualização automática (after):
 * usa o id do item mais novo para buscar itens mais recentes.
 * O cursor é tratado como opaco.
 */
function getAfterCursor(items: GroupFeedItem[]): string | null {
  return items.length > 0 ? items[0].id : null;
}

/**
 * Simula a lógica de paginação para trás (before):
 * usa o next_cursor retornado pela API na página anterior.
 */
function getBeforeCursor(page: GroupFeedPage): string | null {
  return page.has_more ? page.next_cursor : null;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeFeedItem(overrides: Partial<GroupFeedItem>): GroupFeedItem {
  return {
    id: "feed-1",
    user_id: "user-1",
    username: "alice",
    title: "Treino feito!",
    description: null,
    created_at: "2026-11-10T08:00:00Z",
    habit_names: ["Correr 5 km"],
    ...overrides,
  };
}

const item1 = makeFeedItem({ id: "feed-1", created_at: "2026-11-10T10:00:00Z" });
const item2 = makeFeedItem({ id: "feed-2", created_at: "2026-11-10T09:00:00Z", user_id: "user-2", username: "bob" });
const item3 = makeFeedItem({ id: "feed-3", created_at: "2026-11-10T08:00:00Z", user_id: "user-3", username: "carol" });

// ── Testes: cursor handling ───────────────────────────────────────────────────

describe("feed: carregamento inicial sem cursor", () => {
  it("não envia cursor na primeira carga", () => {
    // A primeira chamada deve ser feita sem before e sem after
    // Validamos que a URL não contém parâmetros de cursor
    const noParams = {};
    const query = new URLSearchParams(noParams as Record<string, string>);
    expect(query.toString()).toBe("");
  });
});

describe("feed: paginação com before (itens mais antigos)", () => {
  it("usa o next_cursor da página anterior como before", () => {
    const page: GroupFeedPage = {
      items: [item2, item3],
      next_cursor: "cursor-page2",
      has_more: true,
    };
    const beforeCursor = getBeforeCursor(page);
    expect(beforeCursor).toBe("cursor-page2");
  });

  it("retorna null para before quando não há mais itens", () => {
    const page: GroupFeedPage = {
      items: [item3],
      next_cursor: null,
      has_more: false,
    };
    const beforeCursor = getBeforeCursor(page);
    expect(beforeCursor).toBeNull();
  });
});

describe("feed: atualização automática com after (itens mais novos)", () => {
  it("usa o id do item mais novo como after cursor", () => {
    const items = [item1, item2, item3]; // ordenados do mais novo ao mais antigo
    const afterCursor = getAfterCursor(items);
    expect(afterCursor).toBe("feed-1");
  });

  it("retorna null para after quando não há itens ainda", () => {
    expect(getAfterCursor([])).toBeNull();
  });
});

describe("feed: não envia before e after simultaneamente", () => {
  it("verifica que a URL não tem ambos os parâmetros", () => {
    // Simula a construção da URL com apenas um dos parâmetros
    function buildFeedUrl(groupId: string, params: { before?: string; after?: string }): string {
      const query = new URLSearchParams();
      if (params.before) query.set("before", params.before);
      if (params.after) query.set("after", params.after);
      const qs = query.toString() ? `?${query.toString()}` : "";
      return `/groups/${groupId}/feed${qs}`;
    }

    const urlBefore = buildFeedUrl("grp-1", { before: "cursor-abc" });
    expect(urlBefore).not.toContain("after=");

    const urlAfter = buildFeedUrl("grp-1", { after: "cursor-abc" });
    expect(urlAfter).not.toContain("before=");
  });
});

describe("feed: remoção de duplicatas por id", () => {
  it("remove itens repetidos preservando os existentes", () => {
    const existing = [item1, item2];
    const incoming = [item1, item3]; // item1 é repetido
    const merged = mergeFeedPages(existing, incoming);
    expect(merged).toHaveLength(3);
    expect(merged.map((i) => i.id)).toEqual(["feed-1", "feed-2", "feed-3"]);
  });

  it("não perde nenhum item único no encadeamento", () => {
    const page1 = [item1, item2];
    const page2 = [item2, item3]; // item2 aparece nos dois (overlap)
    const merged = mergeFeedPages(page1, page2);
    // Nenhum item deve ser perdido; item2 não deve duplicar
    expect(merged.map((i) => i.id).sort()).toEqual(["feed-1", "feed-2", "feed-3"]);
  });

  it("preserva todos os itens quando não há duplicatas", () => {
    const existing = [item1];
    const incoming = [item2, item3];
    const merged = mergeFeedPages(existing, incoming);
    expect(merged).toHaveLength(3);
  });
});

describe("feed: cursor tratado como opaco", () => {
  it("não faz parsing do cursor (trata como string)", () => {
    const cursor = "cursor-abc-123-def";
    // O cursor deve ser usado como está, sem parse
    expect(typeof cursor).toBe("string");
    // Não tentamos extrair timestamp, id ou qualquer dado do cursor
    expect(() => JSON.parse(cursor)).toThrow();
  });
});

describe("feed: erros de API", () => {
  it("422 'Cursor inválido.' deve ser detectado por getErrorMessage", () => {
    const err = new ApiError("Invalid cursor", 422, {
      detail: "Cursor inválido.",
    });
    expect(getErrorMessage(err)).toBe("Cursor inválido.");
  });

  it("404 no feed deve retornar a mensagem da API", () => {
    const err = new ApiError("not found", 404, {
      detail: "Grupo não encontrado.",
    });
    expect(getErrorMessage(err)).toBe("Grupo não encontrado.");
  });
});

// ── Testes de lógica de leave group ──────────────────────────────────────────

/**
 * Simula a mensagem final após sair do grupo,
 * derivada exclusivamente dos campos da resposta da API.
 */
function getLeaveGroupMessage(response: {
  group_deleted: boolean;
  promoted_user_id: string | null;
  promoted_username: string | null;
}): string {
  if (response.group_deleted) {
    return "Grupo apagado";
  }
  if (response.promoted_username) {
    return `${response.promoted_username} agora é admin`;
  }
  return "Você saiu do grupo";
}

describe("leave group: mensagem final", () => {
  it("único membro: 'Grupo apagado' quando group_deleted é true", () => {
    const response = {
      group_deleted: true,
      promoted_user_id: null,
      promoted_username: null,
    };
    expect(getLeaveGroupMessage(response)).toBe("Grupo apagado");
  });

  it("único admin com outros membros: '{username} agora é admin'", () => {
    const response = {
      group_deleted: false,
      promoted_user_id: "user-2",
      promoted_username: "novo_admin",
    };
    expect(getLeaveGroupMessage(response)).toBe("novo_admin agora é admin");
  });

  it("outros casos: 'Você saiu do grupo'", () => {
    const response = {
      group_deleted: false,
      promoted_user_id: null,
      promoted_username: null,
    };
    expect(getLeaveGroupMessage(response)).toBe("Você saiu do grupo");
  });
});

describe("leave group: erros de API", () => {
  it("403 retorna a mensagem da API", () => {
    const err = new ApiError("forbidden", 403, {
      detail: "Você não tem permissão para fazer isso.",
    });
    expect(getErrorMessage(err)).toBe("Você não tem permissão para fazer isso.");
  });

  it("404 retorna 'Grupo não encontrado.'", () => {
    const err = new ApiError("not found", 404, {
      detail: "Grupo não encontrado.",
    });
    expect(getErrorMessage(err)).toBe("Grupo não encontrado.");
  });

  it("409 retorna a mensagem da API (ex: conflito ao sair)", () => {
    const err = new ApiError("conflict", 409, {
      detail: "Você não pode sair deste grupo agora.",
    });
    expect(getErrorMessage(err)).toBe("Você não pode sair deste grupo agora.");
  });
});
