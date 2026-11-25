/**
 * Testes centralizados de tratamento de erros de API para fluxos de grupos.
 * Valida que getErrorMessage, getFieldErrors e getRejectedHabitIds se comportam
 * corretamente nos cenários específicos dos grupos.
 * Issue: #182 – [Test] Testes de grupos
 */
import { ApiError } from "@/services/api";
import {
  getErrorMessage,
  getFieldErrors,
  getRejectedHabitIds,
  FORM_ERROR_KEY,
} from "@/services/api-errors";

function apiError(status: number, data: unknown): ApiError {
  return new ApiError("msg", status, data);
}

// ── 403 ──────────────────────────────────────────────────────────────────────

describe("grupos: erros 403", () => {
  it("retorna o detail textual da API (não substitui por mensagem genérica)", () => {
    const err = apiError(403, { detail: "Você não é admin deste grupo." });
    expect(getErrorMessage(err)).toBe("Você não é admin deste grupo.");
  });

  it("cai no fallback quando não há detail", () => {
    const err = apiError(403, null);
    expect(getErrorMessage(err)).toBe("Você não tem permissão para fazer isso.");
  });
});

// ── 404 ──────────────────────────────────────────────────────────────────────

describe("grupos: erros 404", () => {
  it("retorna 'Grupo não encontrado.' quando a API manda esse detail", () => {
    const err = apiError(404, { detail: "Grupo não encontrado." });
    expect(getErrorMessage(err)).toBe("Grupo não encontrado.");
  });

  it("retorna 'Código de convite inválido.' para código errado", () => {
    const err = apiError(404, { detail: "Código de convite inválido." });
    expect(getErrorMessage(err)).toBe("Código de convite inválido.");
  });

  it("retorna 'Usuário não encontrado.' ao adicionar membro inexistente", () => {
    const err = apiError(404, { detail: "Usuário não encontrado." });
    expect(getErrorMessage(err)).toBe("Usuário não encontrado.");
  });

  it("retorna 'Hábito não encontrado.' para hábito de grupo inexistente", () => {
    const err = apiError(404, { detail: "Hábito não encontrado." });
    expect(getErrorMessage(err)).toBe("Hábito não encontrado.");
  });
});

// ── 409 ──────────────────────────────────────────────────────────────────────

describe("grupos: erros 409", () => {
  it("retorna 'Grupo encerrado.' ao entrar por código em grupo encerrado", () => {
    const err = apiError(409, { detail: "Grupo encerrado." });
    expect(getErrorMessage(err)).toBe("Grupo encerrado.");
  });

  it("retorna 'Você já participa deste grupo.' ao tentar entrar novamente", () => {
    const err = apiError(409, { detail: "Você já participa deste grupo." });
    expect(getErrorMessage(err)).toBe("Você já participa deste grupo.");
  });

  it("retorna 'Grupo cheio.' quando o grupo atingiu o limite de membros", () => {
    const err = apiError(409, { detail: "Grupo cheio." });
    expect(getErrorMessage(err)).toBe("Grupo cheio.");
  });

  it("retorna 'Hábito já encerrado.' ao tentar encerrar hábito já encerrado", () => {
    const err = apiError(409, { detail: "Hábito já encerrado." });
    expect(getErrorMessage(err)).toBe("Hábito já encerrado.");
  });

  it("retorna 'Usuário já é membro.' ao adicionar membro duplicado", () => {
    const err = apiError(409, { detail: "Usuário já é membro." });
    expect(getErrorMessage(err)).toBe("Usuário já é membro.");
  });

  it("retorna 'Grupo encerrado não aceita check-ins.' em check-in de grupo encerrado", () => {
    const err = apiError(409, {
      detail: "Grupo encerrado não aceita check-ins.",
    });
    expect(getErrorMessage(err)).toBe("Grupo encerrado não aceita check-ins.");
  });

  it("cai no fallback quando não há detail em 409", () => {
    const err = apiError(409, null);
    expect(getErrorMessage(err)).toBe("Esta ação não pode ser feita agora.");
  });
});

// ── 422 (lista de erros de campo) ─────────────────────────────────────────────

describe("grupos: erros 422 em lista", () => {
  it("mapeia campo 'name' de grupo para erro de campo", () => {
    const err = apiError(422, {
      detail: [
        {
          loc: ["body", "name"],
          msg: "String should have at most 100 characters",
        },
      ],
    });
    const errors = getFieldErrors(err);
    expect(errors.name).toBe("String should have at most 100 characters");
  });

  it("mapeia campo 'description' de grupo para erro de campo", () => {
    const err = apiError(422, {
      detail: [
        {
          loc: ["body", "description"],
          msg: "String should have at most 500 characters",
        },
      ],
    });
    const errors = getFieldErrors(err);
    expect(errors.description).toBe("String should have at most 500 characters");
  });

  it("mapeia campo 'ends_on' para erro de campo", () => {
    const err = apiError(422, {
      detail: [
        {
          loc: ["body", "ends_on"],
          msg: "A data de fim não pode ser anterior ao dia atual.",
        },
      ],
    });
    const errors = getFieldErrors(err);
    expect(errors.ends_on).toBe("A data de fim não pode ser anterior ao dia atual.");
  });

  it("mapeia campo 'ranking_criterion' para erro de campo", () => {
    const err = apiError(422, {
      detail: [
        {
          loc: ["body", "ranking_criterion"],
          msg: "Input should be 'check_ins' or 'goals'",
        },
      ],
    });
    const errors = getFieldErrors(err);
    expect(errors.ranking_criterion).toBe(
      "Input should be 'check_ins' or 'goals'",
    );
  });

  it("retorna getFieldErrors vazio para erros que não são 422", () => {
    const err = apiError(409, { detail: "Grupo encerrado." });
    expect(getFieldErrors(err)).toEqual({});
  });

  it("remove prefixo 'Value error, ' do Pydantic nos erros de campo", () => {
    const err = apiError(422, {
      detail: [
        {
          loc: ["body", "ends_on"],
          msg: "Value error, A data de fim deve ser posterior à data de início.",
        },
      ],
    });
    const errors = getFieldErrors(err);
    expect(errors.ends_on).toBe(
      "A data de fim deve ser posterior à data de início.",
    );
  });
});

// ── 422 (detail textual) ──────────────────────────────────────────────────────

describe("grupos: erros 422 com detail textual", () => {
  it("usa getErrorMessage para detail textual (Cursor inválido.)", () => {
    const err = apiError(422, { detail: "Cursor inválido." });
    expect(getErrorMessage(err)).toBe("Cursor inválido.");
  });

  it("retorna getFieldErrors vazio quando detail é string (não lista)", () => {
    const err = apiError(422, { detail: "Cursor inválido." });
    expect(getFieldErrors(err)).toEqual({});
  });
});

// ── Erros de rede e 500 ───────────────────────────────────────────────────────

describe("grupos: erros de rede e servidor", () => {
  it("retorna mensagem de rede para erros não-ApiError", () => {
    expect(getErrorMessage(new TypeError("Network request failed"))).toBe(
      "Não foi possível conectar ao servidor. Verifique sua internet.",
    );
  });

  it("oculta detalhe de erro 500 (não expõe traceback ao usuário)", () => {
    const err = apiError(500, { detail: "Internal Server Error" });
    expect(getErrorMessage(err)).toBe(
      "Erro no servidor. Tente de novo em instantes.",
    );
  });
});

// ── getRejectedHabitIds em contexto de grupos ─────────────────────────────────

describe("grupos: getRejectedHabitIds no check-in", () => {
  it("extrai habit_ids recusados quando grupo está encerrado (404)", () => {
    const err = apiError(404, {
      detail: "Hábito não encontrado.",
      habit_ids: ["gh-1", "gh-2"],
    });
    expect(getRejectedHabitIds(err)).toEqual(["gh-1", "gh-2"]);
  });

  it("extrai habit_ids recusados quando grupo não aceita check-ins (409)", () => {
    const err = apiError(409, {
      detail: "Grupo encerrado não aceita check-ins.",
      habit_ids: ["gh-1"],
    });
    expect(getRejectedHabitIds(err)).toEqual(["gh-1"]);
  });

  it("retorna lista vazia quando não há habit_ids na resposta", () => {
    const err = apiError(409, { detail: "Grupo encerrado." });
    expect(getRejectedHabitIds(err)).toEqual([]);
  });

  it("retorna lista vazia para erros de status diferente de 403/404/409", () => {
    const err = apiError(422, {
      detail: [{ loc: ["body", "name"], msg: "required" }],
    });
    expect(getRejectedHabitIds(err)).toEqual([]);
  });
});

// ── Não substituir detail textual por mensagem genérica ───────────────────────

describe("grupos: detail textual nunca substituído", () => {
  const specificMessages = [
    [403, "Você não é admin deste grupo."],
    [404, "Grupo não encontrado."],
    [404, "Código de convite inválido."],
    [409, "Grupo encerrado."],
    [409, "Você já participa deste grupo."],
    [409, "Grupo cheio."],
    [409, "Hábito já encerrado."],
  ] as const;

  it.each(specificMessages)(
    "status %i: mantém a mensagem '%s' em vez de usar o fallback",
    (status, detail) => {
      const err = apiError(status, { detail });
      expect(getErrorMessage(err)).toBe(detail);
    },
  );
});
