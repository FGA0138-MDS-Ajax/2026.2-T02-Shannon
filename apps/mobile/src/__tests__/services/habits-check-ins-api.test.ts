import { API_URL } from "@/services/api";
import {
  createCheckIn,
  deleteCheckIn,
  getCheckIn,
  listCheckInCategories,
  listHabitOptions,
  updateCheckIn,
} from "@/services/check-ins-api";
import {
  createHabit,
  deleteHabit,
  finishHabit,
  getHabit,
  listHabitCheckIns,
  listHabits,
  updateHabit,
} from "@/services/habits-api";

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

describe("habits-api", () => {
  it.each([
    [() => listHabits(), "GET", "/habits"],
    [() => listHabits("finished"), "GET", "/habits?status=finished"],
    [() => getHabit("h1"), "GET", "/habits/h1"],
    [() => finishHabit("h1"), "POST", "/habits/h1/finish"],
    [() => listHabitCheckIns("h1"), "GET", "/habits/h1/check-ins"],
  ])("should call %#: %s %s", async (call, method, url) => {
    await call();

    expect(lastCall()).toEqual({ url, method, body: undefined });
  });

  it("should create a habit with the body", async () => {
    await createHabit({ name: "Correr", category: "corrida" });

    expect(lastCall()).toEqual({
      url: "/habits",
      method: "POST",
      body: { name: "Correr", category: "corrida" },
    });
  });

  it("should send only the changed fields and keep null to clear", async () => {
    await updateHabit("h1", { description: null });

    expect(lastCall()).toEqual({
      url: "/habits/h1",
      method: "PATCH",
      body: { description: null },
    });
  });

  it("should resolve a 204 delete as undefined", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(null, 204));

    await expect(deleteHabit("h1")).resolves.toBeUndefined();
    expect(lastCall()).toMatchObject({ url: "/habits/h1", method: "DELETE" });
  });
});

describe("check-ins-api", () => {
  it("should list the categories", async () => {
    await listCheckInCategories();

    expect(lastCall()).toMatchObject({
      url: "/check-ins/categories",
      method: "GET",
    });
  });

  it("should list the options of a category", async () => {
    await listHabitOptions({ category: "corrida" });

    expect(lastCall().url).toBe("/check-ins/habit-options?category=corrida");
  });

  it("should page the other categories", async () => {
    await listHabitOptions({
      exclude_category: "corrida",
      page: 2,
      page_size: 3,
    });

    expect(lastCall().url).toBe(
      "/check-ins/habit-options?exclude_category=corrida&page=2&page_size=3",
    );
  });

  it.each([
    [
      () =>
        createCheckIn({
          title: "Treino",
          habit_ids: ["h1", "h2"],
          duration: "PT30M",
        }),
      "POST",
      "/check-ins",
      { title: "Treino", habit_ids: ["h1", "h2"], duration: "PT30M" },
    ],
    [() => getCheckIn("c1"), "GET", "/check-ins/c1", undefined],
    [
      () => updateCheckIn("c1", { duration: null }),
      "PATCH",
      "/check-ins/c1",
      { duration: null },
    ],
  ])("should call %#: %s %s", async (call, method, url, body) => {
    await call();

    expect(lastCall()).toEqual({ url, method, body });
  });

  it("should resolve a 204 delete as undefined", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(null, 204));

    await expect(deleteCheckIn("c1")).resolves.toBeUndefined();
    expect(lastCall()).toMatchObject({
      url: "/check-ins/c1",
      method: "DELETE",
    });
  });

  it("should send the Bearer on every call", async () => {
    await listHabitOptions({ category: "sono" });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer acc");
  });
});
