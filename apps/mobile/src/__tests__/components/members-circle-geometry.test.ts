import {
  ringPath,
  sliceAngles,
  slicePath,
} from "@/components/groups/members-circle/geometry";

describe("sliceAngles", () => {
  it("splits the circle with a gap between slices", () => {
    expect(sliceAngles(0, 4)).toEqual({ start: 4, end: 86 });
    expect(sliceAngles(3, 4)).toEqual({ start: 274, end: 356 });
  });

  it("narrows the gap in big groups", () => {
    const { start, end } = sliceAngles(0, 30);
    expect(start).toBeCloseTo(1.8);
    expect(end).toBeCloseTo(10.2);
  });
});

describe("slicePath", () => {
  it("draws a closed path with rounded corners", () => {
    const path = slicePath({
      cx: 100,
      cy: 100,
      inner: 40,
      outer: 90,
      start: 4,
      end: 86,
      corner: 12,
    });

    expect(path.startsWith("M ")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path.match(/A /g)).toHaveLength(6);
  });
});

describe("ringPath", () => {
  it("draws the outer circle and the hole", () => {
    const path = ringPath({ cx: 100, cy: 100, inner: 40, outer: 90 });

    expect(path.match(/Z/g)).toHaveLength(2);
  });
});
