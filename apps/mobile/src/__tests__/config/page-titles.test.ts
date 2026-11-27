import { formatPageTitle, titleForSegments } from "@/config/page-titles";

describe("page titles", () => {
  it("mostra só o nome do app na página inicial", () => {
    expect(titleForSegments([])).toBe("Habbit");
  });

  it("usa o título da rota com o nome do app", () => {
    expect(titleForSegments(["(auth)", "login"])).toBe("Entrar · Habbit");
    expect(titleForSegments(["(app)", "(tabs)"])).toBe("Painel · Habbit");
    expect(titleForSegments(["(app)", "(tabs)", "habits"])).toBe(
      "Meus hábitos · Habbit",
    );
  });

  it("ignora o segmento index das rotas aninhadas", () => {
    expect(
      titleForSegments(["(app)", "check-ins", "[id]", "edit", "index"]),
    ).toBe("Editar check-in · Habbit");
  });

  it("cai no nome do app em rota sem título", () => {
    expect(titleForSegments(["(app)", "desconhecida"])).toBe("Habbit");
  });

  it("formata títulos dinâmicos", () => {
    expect(formatPageTitle("Família")).toBe("Família · Habbit");
    expect(formatPageTitle(undefined)).toBe("Habbit");
  });
});
