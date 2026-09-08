import { clamp, damp, lerp, mapRange, smoothstep } from "@/lib/motion/mathUtils";

describe("motion math utilities", () => {
  describe("clamp", () => {
    it("passes values already inside the default [0,1] range through unchanged", () => {
      expect(clamp(0.5)).toBe(0.5);
    });

    it("clamps values below the minimum", () => {
      expect(clamp(-5)).toBe(0);
      expect(clamp(-5, -10, 10)).toBe(-5);
    });

    it("clamps values above the maximum", () => {
      expect(clamp(5)).toBe(1);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe("lerp", () => {
    it("interpolates linearly between two values", () => {
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(-10, 10, 0.25)).toBe(-5);
    });

    it("is not clamped — extrapolates outside [0,1]", () => {
      expect(lerp(0, 10, 1.5)).toBe(15);
      expect(lerp(0, 10, -0.5)).toBe(-5);
    });
  });

  describe("smoothstep", () => {
    it("returns 0 at or before the start edge and 1 at or after the end edge", () => {
      expect(smoothstep(0, 1, -1)).toBe(0);
      expect(smoothstep(0, 1, 0)).toBe(0);
      expect(smoothstep(0, 1, 1)).toBe(1);
      expect(smoothstep(0, 1, 2)).toBe(1);
    });

    it("eases smoothly (non-linearly) through the midpoint", () => {
      expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5);
      // Smoothstep's derivative is 0 at the edges, so progress near an edge
      // is slower than linear.
      expect(smoothstep(0, 1, 0.1)).toBeLessThan(0.1 * 1.5);
    });

    it("guards against a zero-width edge range without dividing by zero", () => {
      expect(() => smoothstep(1, 1, 1)).not.toThrow();
      expect(Number.isFinite(smoothstep(1, 1, 1))).toBe(true);
    });
  });

  describe("mapRange", () => {
    it("remaps a value from one range into another", () => {
      expect(mapRange(5, 0, 10, 0, 100)).toBe(50);
      expect(mapRange(0, 0, 10, -1, 1)).toBe(-1);
      expect(mapRange(10, 0, 10, -1, 1)).toBe(1);
    });

    it("clamps the input to the source range before remapping", () => {
      expect(mapRange(-5, 0, 10, 0, 100)).toBe(0);
      expect(mapRange(15, 0, 10, 0, 100)).toBe(100);
    });
  });

  describe("damp", () => {
    it("does not move when delta time is 0", () => {
      expect(damp(0, 10, 5, 0)).toBe(0);
    });

    it("moves partway toward the target for a small, finite delta", () => {
      const result = damp(0, 10, 5, 0.016);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(10);
    });

    it("approaches (but by construction never exactly reaches) the target as delta grows", () => {
      const result = damp(0, 10, 5, 5);
      expect(result).toBeCloseTo(10, 1);
      expect(result).toBeLessThan(10);
    });
  });
});
