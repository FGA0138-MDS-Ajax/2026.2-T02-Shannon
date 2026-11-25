import {
  formatLongDateTime,
  formatMonthYear,
  formatTime,
  toApiDate,
  weekDays,
} from "@/utils/date";

// O ISO sai de uma data local para o teste passar em qualquer fuso
const morning = new Date(2026, 10, 13, 9, 5).toISOString();

describe("formatTime", () => {
  it("shows hours and minutes with two digits", () => {
    expect(formatTime(morning)).toBe("09:05");
  });
});

describe("formatLongDateTime", () => {
  it("shows the day, the month name, the year and the time", () => {
    expect(formatLongDateTime(morning)).toBe("13 de novembro de 2026 · 09:05");
  });
});

describe("formatMonthYear", () => {
  it("shows the month in capitals and the year", () => {
    expect(formatMonthYear(new Date(2026, 10, 13))).toBe("NOVEMBRO 2026");
  });
});

describe("weekDays", () => {
  it("goes from Monday to Sunday of the same week", () => {
    expect(weekDays(new Date(2026, 10, 13)).map(toApiDate)).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
    ]);
  });

  it("keeps Sunday in the week that started on Monday", () => {
    const days = weekDays(new Date(2026, 10, 15)).map(toApiDate);
    expect(days[0]).toBe("2026-11-09");
    expect(days[6]).toBe("2026-11-15");
  });

  it("crosses the month when the week does", () => {
    const days = weekDays(new Date(2026, 11, 2)).map(toApiDate);
    expect(days[0]).toBe("2026-11-30");
    expect(days[6]).toBe("2026-12-06");
  });
});
