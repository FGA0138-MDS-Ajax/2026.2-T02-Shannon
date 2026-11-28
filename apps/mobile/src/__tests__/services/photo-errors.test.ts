import { ApiError } from "@/services/api";
import { getPhotoErrorInfo } from "@/services/photo-errors";

function api(status: number, detail?: string) {
  return new ApiError("erro", status, detail ? { detail } : undefined);
}

describe("getPhotoErrorInfo", () => {
  it("400 pede outra imagem", () => {
    expect(getPhotoErrorInfo(api(400))).toEqual({
      message: "Arquivo de imagem inválido. Escolha outra foto.",
      action: "none",
    });
    expect(getPhotoErrorInfo(api(400, "Arquivo de imagem inválido."))).toEqual({
      message: "Arquivo de imagem inválido. Escolha outra foto.",
      action: "none",
    });
  });

  it("403 esconde os controles, com ou sem JSON", () => {
    expect(getPhotoErrorInfo(api(403, "Você não pode alterar esta foto."))).toEqual(
      { message: "Você não pode alterar esta foto.", action: "hide" },
    );
    expect(getPhotoErrorInfo(api(403))).toEqual({
      message: "Você não tem permissão para fazer isso.",
      action: "hide",
    });
  });

  it("409 esconde os controles, com ou sem JSON", () => {
    expect(
      getPhotoErrorInfo(
        api(409, "Só é possível alterar a foto de um check-in de hoje."),
      ),
    ).toEqual({
      message: "Só é possível alterar a foto de um check-in de hoje.",
      action: "hide",
    });
    expect(getPhotoErrorInfo(api(409))).toEqual({
      message: "Esta ação não pode ser feita agora.",
      action: "hide",
    });
  });

  it("404 manda voltar para a lista", () => {
    expect(getPhotoErrorInfo(api(404, "Check-in não encontrado."))).toEqual({
      message: "Check-in não encontrado.",
      action: "back",
    });
    expect(getPhotoErrorInfo(api(404))).toEqual({
      message: "Check-in não encontrado.",
      action: "back",
    });
  });

  it("413 mostra o limite de 4 MB mesmo sem JSON da Vercel", () => {
    expect(getPhotoErrorInfo(api(413))).toEqual({
      message: "A foto deve ter no máximo 4 MB.",
      action: "none",
    });
    expect(
      getPhotoErrorInfo(api(413, "A foto deve ter no máximo 4 MB.")),
    ).toEqual({
      message: "A foto deve ter no máximo 4 MB.",
      action: "none",
    });
  });

  it("415 explica os formatos aceitos", () => {
    expect(getPhotoErrorInfo(api(415))).toEqual({
      message: "Formato não suportado. Envie uma imagem JPEG ou PNG.",
      action: "none",
    });
  });

  it("503 permite tentar de novo com a mesma imagem", () => {
    expect(
      getPhotoErrorInfo(api(503, "Não foi possível salvar a foto.")),
    ).toEqual({
      message: "Não foi possível salvar a foto.",
      action: "retry",
    });
    expect(getPhotoErrorInfo(api(503))).toEqual({
      message: "Não foi possível salvar a foto. Tente novamente.",
      action: "retry",
    });
  });

  it("falha de rede também permite tentar de novo", () => {
    expect(getPhotoErrorInfo(new Error("offline"))).toEqual({
      message: "Não foi possível conectar ao servidor. Verifique sua internet.",
      action: "retry",
    });
  });
});
