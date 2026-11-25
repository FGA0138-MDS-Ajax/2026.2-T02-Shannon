import { formatLongDateTime, formatTime } from "@/utils/date";

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
