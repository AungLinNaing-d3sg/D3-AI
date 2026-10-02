import { gapFocus, SHAPES, shapePoints, waveHeight } from "@/lib/particles/shapes";

describe("particle shapes", () => {
  it.each(SHAPES)("builds %s with the requested number of bounded points", (kind) => {
    const points = shapePoints(kind, 500);
    expect(points).toHaveLength(1500);
    points.forEach((value) => {
      expect(Number.isFinite(value)).toBe(true);
      expect(Math.abs(value)).toBeLessThanOrEqual(1.35);
    });
  });

  it("is deterministic, so shapes look the same on every load", () => {
    expect(Array.from(shapePoints("torus", 50))).toEqual(Array.from(shapePoints("torus", 50)));
  });

  it("keeps the wave lattice gentle", () => {
    for (let t = 0; t < 5; t += 0.5) expect(Math.abs(waveHeight(0.7, -0.3, t))).toBeLessThan(0.33);
  });
});

describe("gap focus", () => {
  const vh = 1000;

  it("shows a gap's shape fully when its boundary is at mid-screen", () => {
    expect(gapFocus([-800, 500, 1900], vh)).toEqual({ index: 1, strength: 1 });
  });

  it("shows nothing while a section fills the screen", () => {
    expect(gapFocus([-900, 1600], vh)).toEqual({ index: -1, strength: 0 });
  });

  it("fades the shape as its boundary moves away from the middle", () => {
    const near = gapFocus([600], vh).strength;
    const far = gapFocus([800], vh).strength;
    expect(near).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(0);
  });
});
