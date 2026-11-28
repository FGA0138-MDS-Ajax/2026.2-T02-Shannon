import { ApiError } from "@/services/api";
import {
  getAccountFieldErrors,
  getPasswordFieldErrors,
} from "@/services/account-errors";

describe("getAccountFieldErrors", () => {
  it("coloca a senha atual errada no campo da senha", () => {
    expect(
      getAccountFieldErrors(
        new ApiError("Senha atual incorreta.", 400, {
          detail: "Senha atual incorreta.",
        }),
      ),
    ).toEqual({ current_password: "Senha atual incorreta." });
  });

  it("separa os 409 de username e de e-mail", () => {
    expect(
      getAccountFieldErrors(
        new ApiError("Username já cadastrado.", 409, {
          detail: "Username já cadastrado.",
        }),
      ),
    ).toEqual({ username: "Username já cadastrado." });
    expect(
      getAccountFieldErrors(
        new ApiError("E-mail já cadastrado.", 409, {
          detail: "E-mail já cadastrado.",
        }),
      ),
    ).toEqual({ email: "E-mail já cadastrado." });
  });

  it("usa o loc do 422 para achar o campo", () => {
    const error = new ApiError("Erro de validação.", 422, {
      detail: [
        {
          loc: ["body", "username"],
          msg: "Value error, Use apenas letras minúsculas.",
        },
      ],
    });

    expect(getAccountFieldErrors(error)).toEqual({
      username: "Use apenas letras minúsculas.",
    });
  });

  it("leva o 422 de e-mail sem senha para o campo do e-mail", () => {
    const error = new ApiError("Erro de validação.", 422, {
      detail: [
        {
          loc: ["body"],
          msg: "Value error, Informe a senha atual para alterar o e-mail.",
        },
      ],
    });

    expect(getAccountFieldErrors(error)).toEqual({
      current_password: "Informe a senha atual para alterar o e-mail.",
    });
  });

  it("não inventa campo para erro de rede", () => {
    expect(getAccountFieldErrors(new Error("rede"))).toEqual({});
  });
});

describe("getPasswordFieldErrors", () => {
  it("coloca a senha atual errada no campo da senha", () => {
    expect(
      getPasswordFieldErrors(
        new ApiError("Senha atual incorreta.", 400, {
          detail: "Senha atual incorreta.",
        }),
      ),
    ).toEqual({ current_password: "Senha atual incorreta." });
  });

  it("usa o loc do 422 para achar o campo", () => {
    const error = new ApiError("Erro de validação.", 422, {
      detail: [
        {
          loc: ["body", "new_password"],
          msg: "Value error, A senha deve ter no máximo 72 bytes.",
        },
      ],
    });

    expect(getPasswordFieldErrors(error)).toEqual({
      new_password: "A senha deve ter no máximo 72 bytes.",
    });
  });

  it("leva a confirmação divergente para o campo de confirmação", () => {
    const error = new ApiError("Erro de validação.", 422, {
      detail: [
        {
          loc: ["body"],
          msg: "Value error, A confirmação não confere com a nova senha.",
        },
      ],
    });

    expect(getPasswordFieldErrors(error)).toEqual({
      new_password_confirmation:
        "A confirmação não confere com a nova senha.",
    });
  });

  it("leva a senha repetida para o campo da nova senha", () => {
    const error = new ApiError("Erro de validação.", 422, {
      detail: [
        {
          loc: ["body"],
          msg: "Value error, A nova senha deve ser diferente da atual.",
        },
      ],
    });

    expect(getPasswordFieldErrors(error)).toEqual({
      new_password: "A nova senha deve ser diferente da atual.",
    });
  });
});
