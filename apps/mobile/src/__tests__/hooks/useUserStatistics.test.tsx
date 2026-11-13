import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { useUserStatistics } from "@/hooks/useUserStatistics";
import { ApiError } from "@/services/api";
import { getUserStatistics } from "@/services/statistics-api";
import type { UserStatistics } from "@/services/types/statistics";

jest.mock("@/services/statistics-api", () => ({
  getUserStatistics: jest.fn(),
}));

const mockGetUserStatistics = getUserStatistics as jest.MockedFunction<
  typeof getUserStatistics
>;

const emptyStatistics: UserStatistics = {
  reference_date: "2026-11-12",
  timezone: "America/Sao_Paulo",
  mode: "calendar",
  habits: { total: 0, active: 0, finished: 0 },
  check_ins: { total: 0, today: 0, week: 0, month: 0 },
  completed_habits: { today: 0, week: 0, month: 0 },
  goal_completion: {
    completed_periods: 0,
    total_periods: 0,
    rate: 0,
    days: 30,
  },
  activity_streak: { current: 0, best: 0 },
  at_risk: { count: 0, habit_ids: [] },
  habit_progress: [],
  series: { start: "2026-10-14", end: "2026-11-12", points: [] },
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useUserStatistics", () => {
  it("starts with calendar and 30 days", async () => {
    mockGetUserStatistics.mockResolvedValue(emptyStatistics);

    const { result } = await renderHook(() => useUserStatistics({}), {
      wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.data).toEqual(emptyStatistics);
    expect(mockGetUserStatistics).toHaveBeenCalledWith({
      mode: "calendar",
      days: 30,
    });
  });

  it("is loading until the first response", async () => {
    mockGetUserStatistics.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHook(() => useUserStatistics({}), {
      wrapper,
    });

    expect(result.current.status).toBe("loading");
  });

  it("fetches again when the filters change", async () => {
    mockGetUserStatistics.mockResolvedValue(emptyStatistics);

    const { result, rerender } = await renderHook(
      (filters: { days: number }) => useUserStatistics(filters),
      { wrapper, initialProps: { days: 30 } },
    );
    await waitFor(() => expect(result.current.status).toBe("success"));

    await rerender({ days: 7 });

    await waitFor(() =>
      expect(mockGetUserStatistics).toHaveBeenLastCalledWith({
        mode: "calendar",
        days: 7,
      }),
    );
  });

  it("does not fetch with days outside 1 to 365", async () => {
    await renderHook(() => useUserStatistics({ days: 366 }), { wrapper });

    expect(mockGetUserStatistics).not.toHaveBeenCalled();
  });

  it("keeps the newest response when an old one arrives late", async () => {
    let resolveOld: (value: UserStatistics) => void = () => {};
    mockGetUserStatistics
      .mockReturnValueOnce(new Promise((resolve) => (resolveOld = resolve)))
      .mockResolvedValueOnce({ ...emptyStatistics, mode: "rolling" });

    const { result, rerender } = await renderHook(
      (filters: { mode: "calendar" | "rolling" }) => useUserStatistics(filters),
      { wrapper, initialProps: { mode: "calendar" } },
    );
    await rerender({ mode: "rolling" });
    await waitFor(() => expect(result.current.data?.mode).toBe("rolling"));

    await act(async () => resolveOld(emptyStatistics));

    expect(result.current.data?.mode).toBe("rolling");
  });

  it("maps 422 errors to the mode and days fields", async () => {
    mockGetUserStatistics.mockRejectedValue(
      new ApiError("Unprocessable", 422, {
        detail: [
          {
            loc: ["query", "days"],
            msg: "Input should be less than or equal to 365",
          },
        ],
      }),
    );

    const { result } = await renderHook(() => useUserStatistics({}), {
      wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.fieldErrors.days).toBe(
      "Input should be less than or equal to 365",
    );
    expect(result.current.fieldErrors.mode).toBeUndefined();
  });

  it("exposes network errors and retries with refetch", async () => {
    mockGetUserStatistics
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValueOnce(emptyStatistics);

    const { result } = await renderHook(() => useUserStatistics({}), {
      wrapper,
    });
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toEqual(expect.any(String));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
  });

  it("reports a 401 that the session could not recover as an error", async () => {
    mockGetUserStatistics.mockRejectedValue(
      new ApiError("Token expirado.", 401, { detail: "Token expirado." }),
    );

    const { result } = await renderHook(() => useUserStatistics({}), {
      wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
  });
});
