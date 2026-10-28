import { ApiError } from "@/services/api";
import {
  FORM_ERROR_KEY,
  getErrorMessage,
  getFieldErrors,
  getRejectedHabitIds,
} from "@/services/api-errors";

function apiError(status: number, data: unknown): ApiError {
  return new ApiError("msg", status, data);
}

describe("getErrorMessage", () => {
  it("should use the detail text from the API", () => {
    const error = apiError(409, { detail: "Hábito já encerrado." });

    expect(getErrorMessage(error)).toBe("Hábito já encerrado.");
  });

  it("should fall back to a message per status when detail is a list", () => {
    const error = apiError(422, {
      detail: [{ loc: ["body", "name"], msg: "Field required" }],
    });

    expect(getErrorMessage(error)).toBe("Confira os campos destacados.");
  });

  it.each([
    [403, "Você não tem permissão para fazer isso."],
    [404, "Não encontrado."],
    [409, "Esta ação não pode ser feita agora."],
  ])("should have a friendly message for %i without detail", (status, text) => {
    expect(getErrorMessage(apiError(status, null))).toBe(text);
  });

  it("should hide server error details", () => {
    const error = apiError(500, { detail: "Traceback..." });

    expect(getErrorMessage(error)).toBe(
      "Erro no servidor. Tente de novo em instantes.",
    );
  });

  it("should treat anything that is not an ApiError as a network failure", () => {
    expect(getErrorMessage(new TypeError("Network request failed"))).toBe(
      "Não foi possível conectar ao servidor. Verifique sua internet.",
    );
  });
});

describe("getFieldErrors", () => {
  it("should map each loc to its field, keeping the first message", () => {
    const error = apiError(422, {
      detail: [
        {
          loc: ["body", "name"],
          msg: "String should have at least 1 character",
        },
        { loc: ["body", "name"], msg: "segunda mensagem" },
        { loc: ["body", "habit_ids", 0], msg: "Input should be a valid UUID" },
        {
          loc: ["query", "page"],
          msg: "Input should be greater than or equal to 1",
        },
      ],
    });

    expect(getFieldErrors(error)).toEqual({
      name: "String should have at least 1 character",
      habit_ids: "Input should be a valid UUID",
      page: "Input should be greater than or equal to 1",
    });
  });

  it("should strip the Pydantic prefix and use the form key without a field", () => {
    const error = apiError(422, {
      detail: [
        { loc: ["body"], msg: "Value error, O nome não pode ser nulo." },
      ],
    });

    expect(getFieldErrors(error)).toEqual({
      [FORM_ERROR_KEY]: "O nome não pode ser nulo.",
    });
  });

  it("should return an empty object when detail is text", () => {
    const error = apiError(422, {
      detail: "A data final não pode ser anterior à criação.",
    });

    expect(getFieldErrors(error)).toEqual({});
  });

  it("should return an empty object for other errors", () => {
    expect(getFieldErrors(apiError(404, { detail: "x" }))).toEqual({});
    expect(getFieldErrors(new Error("x"))).toEqual({});
  });
});

describe("getRejectedHabitIds", () => {
  it.each([403, 404, 409])("should return the habit_ids of a %i", (status) => {
    const error = apiError(status, {
      detail: "Hábito encerrado não aceita check-ins.",
      habit_ids: ["h1", "h2"],
    });

    expect(getRejectedHabitIds(error)).toEqual(["h1", "h2"]);
  });

  it("should return an empty list when it is not a rejection", () => {
    expect(getRejectedHabitIds(apiError(422, { habit_ids: ["h1"] }))).toEqual(
      [],
    );
    expect(getRejectedHabitIds(apiError(404, { detail: "x" }))).toEqual([]);
    expect(getRejectedHabitIds(new Error("x"))).toEqual([]);
  });
});
