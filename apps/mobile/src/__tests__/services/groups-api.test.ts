import { API_URL, ApiError } from "@/services/api";
import {
  addMember,
  createGroup,
  createGroupHabit,
  finishGroupHabit,
  groupKeys,
  joinGroup,
  leaveGroup,
  normalizeInviteCode,
  previewGroup,
  promoteMember,
  regenerateInviteCode,
  removeMember,
  updateGroup,
  updateGroupHabit,
} from "@/services/groups-api";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () =>
    JSON.stringify({ accessToken: "acc", refreshToken: "ref", exp: 1 }),
  ),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function lastCall(): { url: string; method: string; body: unknown } {
  const [url, init] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
  return {
    url: url.replace(API_URL, ""),
    method: init.method ?? "GET",
    body: init.body === undefined ? undefined : JSON.parse(init.body),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue(makeResponse({}));
});

describe("normalizeInviteCode", () => {
  it("removes spaces and hyphens and uppercases, like the API", () => {
    expect(normalizeInviteCode(" k7p4-m9x2 ")).toBe("K7P4M9X2");
    expect(normalizeInviteCode("k7 p4 m9 x2")).toBe("K7P4M9X2");
  });
});

describe("groupKeys", () => {
  it("builds the GET routes used as SWR keys", () => {
    expect(groupKeys.habits("g1", "finished")).toBe(
      "/groups/g1/habits?status=finished",
    );
    expect(groupKeys.feed("g1", { limit: 20, before: "abc" })).toBe(
      "/groups/g1/check-ins?limit=20&before=abc",
    );
    expect(groupKeys.habitStats("g1", "h1")).toBe("/groups/g1/habits/h1/stats");
  });
});

describe("groups-api", () => {
  it.each([
    [
      "createGroup",
      () => createGroup({ name: "Corrida", ranking_criterion: "check_ins" }),
      "POST",
      "/groups",
      { name: "Corrida", ranking_criterion: "check_ins" },
    ],
    [
      "updateGroup reopens with ends_on null",
      () => updateGroup("g1", { ends_on: null }),
      "PATCH",
      "/groups/g1",
      { ends_on: null },
    ],
    [
      "previewGroup normalizes the code",
      () => previewGroup("k7p4-m9x2"),
      "GET",
      "/groups/invite/K7P4M9X2",
      undefined,
    ],
    [
      "joinGroup normalizes the code",
      () => joinGroup("k7p4 m9x2"),
      "POST",
      "/groups/join",
      { code: "K7P4M9X2" },
    ],
    [
      "regenerateInviteCode",
      () => regenerateInviteCode("g1"),
      "POST",
      "/groups/g1/invite/regenerate",
      undefined,
    ],
    [
      "addMember",
      () => addMember("g1", "ana"),
      "POST",
      "/groups/g1/members",
      { username: "ana" },
    ],
    [
      "promoteMember",
      () => promoteMember("g1", "u2"),
      "POST",
      "/groups/g1/members/u2/promote",
      undefined,
    ],
    [
      "leaveGroup",
      () => leaveGroup("g1"),
      "POST",
      "/groups/g1/leave",
      undefined,
    ],
    [
      "createGroupHabit",
      () =>
        createGroupHabit("g1", {
          name: "Ler",
          category: "leitura",
          goal: { period: "day" },
        }),
      "POST",
      "/groups/g1/habits",
      { name: "Ler", category: "leitura", goal: { period: "day" } },
    ],
    [
      "updateGroupHabit",
      () => updateGroupHabit("g1", "h1", { name: "Ler 20" }),
      "PATCH",
      "/groups/g1/habits/h1",
      { name: "Ler 20" },
    ],
    [
      "finishGroupHabit",
      () => finishGroupHabit("g1", "h1"),
      "POST",
      "/groups/g1/habits/h1/finish",
      undefined,
    ],
  ])("%s calls the right route", async (_name, call, method, url, body) => {
    await call();
    expect(lastCall()).toEqual({ url, method, body });
  });

  it("removeMember sends DELETE and handles 204", async () => {
    mockFetch.mockResolvedValue(makeResponse(null, 204));

    await expect(removeMember("g1", "u2")).resolves.toBeUndefined();
    expect(lastCall()).toEqual({
      url: "/groups/g1/members/u2",
      method: "DELETE",
      body: undefined,
    });
  });

  it("rejects with the API message when the group is full", async () => {
    mockFetch.mockResolvedValue(makeResponse({ detail: "Grupo cheio." }, 409));

    await expect(joinGroup("K7P4M9X2")).rejects.toMatchObject({
      status: 409,
      message: "Grupo cheio.",
    });
  });
});

describe("erros HTTP", () => {
  it.each([403, 404, 409, 422])("rejeita com ApiError status %i e mensagem da API", async (status) => {
    mockFetch.mockResolvedValue(makeResponse({ detail: `Erro ${status}.` }, status));
    await expect(joinGroup("K7P4M9X2")).rejects.toMatchObject({
      status,
      message: `Erro ${status}.`,
    });
    await expect(joinGroup("K7P4M9X2")).rejects.toBeInstanceOf(ApiError);
  });

  it("204 resolve sem tentar ler JSON vazio", async () => {
    mockFetch.mockResolvedValue({
      ok: true, status: 204,
      json: jest.fn().mockRejectedValue(new Error("no body")),
    } as unknown as Response);
    await expect(removeMember("g1", "u2")).resolves.toBeUndefined();
  });
});

describe("hábitos de grupo", () => {
  it("POST envia nome, descrição, categoria, data alvo e meta; sem is_public", async () => {
    await createGroupHabit("g1", { name: "Ler", category: "leitura", description: "d", target_end_date: "2026-12-01", goal: { period: "day" } });
    const body = JSON.parse((mockFetch.mock.calls[mockFetch.mock.calls.length - 1][1]).body);
    expect(body).toMatchObject({ name: "Ler", category: "leitura", description: "d", target_end_date: "2026-12-01", goal: { period: "day" } });
    expect(body.is_public).toBeUndefined();
  });

  it("PATCH não inclui meta; payload só nome/descrição/categoria/data alvo alterados", async () => {
    await updateGroupHabit("g1", "h1", { name: "X", description: null });
    const body = JSON.parse((mockFetch.mock.calls[mockFetch.mock.calls.length - 1][1]).body);
    expect(body).toEqual({ name: "X", description: null });
    expect(body.goal).toBeUndefined();
    expect(body.is_public).toBeUndefined();
  });
});
