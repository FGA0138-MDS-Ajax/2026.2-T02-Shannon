import {
  formatDuration,
  isoDurationToMinutes,
  minutesToIsoDuration,
} from "@/utils/duration";

describe("minutesToIsoDuration", () => {
  it.each([
    [30, "PT30M"],
    [60, "PT1H"],
    [90, "PT1H30M"],
    [1500, "PT25H"],
  ])("should convert %i minutes to %s", (minutes, expected) => {
    expect(minutesToIsoDuration(minutes)).toBe(expected);
  });

  it.each([0, -5, 1.5, Number.NaN])("should reject %p", (minutes) => {
    expect(() => minutesToIsoDuration(minutes)).toThrow(RangeError);
  });
});

describe("isoDurationToMinutes", () => {
  it.each([
    ["PT30M", 30],
    ["PT1H30M", 90],
    ["PT1H", 60],
    ["P1DT2H", 1560],
    ["P1D", 1440],
    ["PT90S", 2],
    ["PT0.5S", 0],
  ])("should convert %s to %i minutes", (duration, expected) => {
    expect(isoDurationToMinutes(duration)).toBe(expected);
  });

  it.each(["", "P", "PT", "P1DT", "1800", "00:30:00", "PT1H30", "pt30m"])(
    "should return null for invalid %p",
    (duration) => {
      expect(isoDurationToMinutes(duration)).toBeNull();
    },
  );

  it("should round-trip with minutesToIsoDuration", () => {
    for (const minutes of [1, 45, 59, 60, 61, 135, 1440]) {
      expect(isoDurationToMinutes(minutesToIsoDuration(minutes))).toBe(minutes);
    }
  });
});

describe("formatDuration", () => {
  it.each([
    ["PT1H30M", "1h 30min"],
    ["PT45M", "45min"],
    ["PT2H", "2h"],
    ["P1DT2H", "1d 2h"],
    ["PT20S", "menos de 1min"],
    ["invalido", ""],
  ])("should format %s as %p", (duration, expected) => {
    expect(formatDuration(duration)).toBe(expected);
  });
});
