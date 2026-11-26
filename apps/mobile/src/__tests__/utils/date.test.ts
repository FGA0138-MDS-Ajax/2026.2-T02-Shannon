import { formatRelativeDateTime } from "@/utils/date";

describe("formatRelativeDateTime", () => {
  const now = new Date(2026, 10, 26, 15, 0);
  const at = (day: number, hour: number) =>
    new Date(2026, 10, day, hour, 30).toISOString();

  it("says today, yesterday or the day and month", () => {
    expect(formatRelativeDateTime(at(26, 7), now)).toBe("Hoje, 07:30");
    expect(formatRelativeDateTime(at(25, 21), now)).toBe("Ontem, 21:30");
    expect(formatRelativeDateTime(at(23, 8), now)).toBe("23/11, 08:30");
  });
});
