import { API_URL } from "@/services/api";
import {
  addMember,
  createGroup,
  createGroupHabit,
  finishGroupHabit,
  getGroup,
  getGroupFeed,
  getGroupHabit,
  getGroupHabitStats,
  getGroupRanking,
  getGroupStats,
  joinGroup,
  leaveGroup,
  listGroupHabits,
  listGroups,
  listMembers,
  previewInvite,
  promoteMember,
  regenerateInvite,
  removeMember,
  updateGroup,
  updateGroupHabit,
} from "@/services/groups-api";
import type { FeedCursor } from "@/services/types/groups";

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

const cursor = "abc" as FeedCursor;

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue(makeResponse({}));
});

describe("groups-api", () => {
  it.each([
    [
      () => createGroup({ name: "Pedal", ranking_criterion: "goals" }),
      "POST",
      "/groups",
      { name: "Pedal", ranking_criterion: "goals" },
    ],
    [() => listGroups(), "GET", "/groups", undefined],
    [() => getGroup("g1"), "GET", "/groups/g1", undefined],
    [() => listMembers("g1"), "GET", "/groups/g1/members", undefined],
    [
      () => addMember("g1", "caio"),
      "POST",
      "/groups/g1/members",
      { username: "caio" },
    ],
    [
      () => promoteMember("g1", "u2"),
      "POST",
      "/groups/g1/members/u2/promote",
      undefined,
    ],
    [() => joinGroup("ab-12 cd"), "POST", "/groups/join", { code: "ab-12 cd" }],
    [
      () => regenerateInvite("g1"),
      "POST",
      "/groups/g1/invite/regenerate",
      undefined,
    ],
    [() => listGroupHabits("g1"), "GET", "/groups/g1/habits", undefined],
    [
      () => listGroupHabits("g1", "finished"),
      "GET",
      "/groups/g1/habits?status=finished",
      undefined,
    ],
    [
      () =>
        createGroupHabit("g1", {
          name: "Pedalar",
          category: "ciclismo",
          goal: { period: "week", target_count: 3, period_end_weekday: 7 },
        }),
      "POST",
      "/groups/g1/habits",
      {
        name: "Pedalar",
        category: "ciclismo",
        goal: { period: "week", target_count: 3, period_end_weekday: 7 },
      },
    ],
    [() => getGroupHabit("g1", "h1"), "GET", "/groups/g1/habits/h1", undefined],
    [
      () => updateGroupHabit("g1", "h1", { target_end_date: null }),
      "PATCH",
      "/groups/g1/habits/h1",
      { target_end_date: null },
    ],
    [
      () => finishGroupHabit("g1", "h1"),
      "POST",
      "/groups/g1/habits/h1/finish",
      undefined,
    ],
    [
      () => getGroupHabitStats("g1", "h1"),
      "GET",
      "/groups/g1/habits/h1/stats",
      undefined,
    ],
    [() => getGroupRanking("g1"), "GET", "/groups/g1/ranking", undefined],
    [() => getGroupStats("g1"), "GET", "/groups/g1/stats", undefined],
  ])("should call %#: %s %s", async (call, method, url, body) => {
    await call();

    expect(lastCall()).toEqual({ url, method, body });
  });

  it("should send only the changed fields and keep null to clear", async () => {
    await updateGroup("g1", { ends_on: null });

    expect(lastCall()).toEqual({
      url: "/groups/g1",
      method: "PATCH",
      body: { ends_on: null },
    });
  });

  it("should encode the invite code typed by the user", async () => {
    await previewInvite("ab 12/cd");

    expect(lastCall().url).toBe("/groups/invite/ab%2012%2Fcd");
  });

  it("should return the leave result from a 200 response", async () => {
    const result = { group_deleted: false, promoted_user_id: "u2" };
    mockFetch.mockResolvedValueOnce(makeResponse(result));

    await expect(leaveGroup("g1")).resolves.toEqual(result);
    expect(lastCall()).toMatchObject({
      url: "/groups/g1/leave",
      method: "POST",
    });
  });

  it("should resolve a 204 member removal as undefined", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(null, 204));

    await expect(removeMember("g1", "u2")).resolves.toBeUndefined();
    expect(lastCall()).toMatchObject({
      url: "/groups/g1/members/u2",
      method: "DELETE",
    });
  });

  it.each([
    [{}, "/groups/g1/check-ins"],
    [{ before: cursor }, "/groups/g1/check-ins?before=abc"],
    [{ after: cursor, limit: 10 }, "/groups/g1/check-ins?after=abc&limit=10"],
  ])("should load the feed with %j", async (params, url) => {
    await getGroupFeed("g1", params);

    expect(lastCall().url).toBe(url);
  });

  it("should send the Bearer on every call", async () => {
    await listGroups();

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer acc");
  });
});
