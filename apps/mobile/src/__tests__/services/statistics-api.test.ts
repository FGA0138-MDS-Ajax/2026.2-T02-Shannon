import { API_URL } from "@/services/api";
import { getUserStatistics } from "@/services/statistics-api";
import type { StatisticsParams } from "@/services/types/statistics";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () =>
    JSON.stringify({ accessToken: "acc", refreshToken: "ref", exp: 1 }),
  ),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

function requestedUrl(): string {
  return mockFetch.mock.calls[0][0].replace(API_URL, "");
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({}),
  });
});

describe("getUserStatistics", () => {
  it("uses the API defaults when no filter is given", async () => {
    await getUserStatistics();

    expect(requestedUrl()).toBe("/user/statistics");
  });

  it("sends mode and days", async () => {
    await getUserStatistics({ mode: "rolling", days: 7 });

    expect(requestedUrl()).toBe("/user/statistics?mode=rolling&days=7");
  });

  it("does not send params outside the contract", async () => {
    await getUserStatistics({
      days: 30,
      user_id: "outra-pessoa",
    } as StatisticsParams);

    expect(requestedUrl()).toBe("/user/statistics?days=30");
  });

  it("sends the access token", async () => {
    await getUserStatistics();

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer acc");
  });
});
