import { SCENE_TIER_CONFIG, tieredParticleCount } from "@/lib/three/deviceTiers";

/**
 * Regression coverage for the responsive 3D quality-tier config (see
 * src/lib/three/deviceTiers.ts) — the single source of truth every chapter
 * scene reads its particle count / object scale / camera depth compression
 * from instead of hand-rolling its own high/low ternary.
 */
describe("deviceTiers", () => {
  describe("SCENE_TIER_CONFIG", () => {
    it("keeps desktop ('high') at full, unscaled cinematic values", () => {
      expect(SCENE_TIER_CONFIG.high).toEqual({
        particleScale: 1,
        objectScale: 1,
        depthScale: 1,
        dpr: [1, 2],
      });
    });

    it("strictly reduces particle/object/depth scale and DPR ceiling from desktop -> tablet -> mobile", () => {
      const { high, medium, low } = SCENE_TIER_CONFIG;

      expect(medium.particleScale).toBeLessThan(high.particleScale);
      expect(low.particleScale).toBeLessThan(medium.particleScale);

      expect(medium.objectScale).toBeLessThan(high.objectScale);
      expect(low.objectScale).toBeLessThan(medium.objectScale);

      expect(medium.depthScale).toBeLessThan(high.depthScale);
      expect(low.depthScale).toBeLessThan(medium.depthScale);

      expect(medium.dpr[1]).toBeLessThan(high.dpr[1]);
      expect(low.dpr[1]).toBeLessThan(medium.dpr[1]);
    });
  });

  describe("tieredParticleCount", () => {
    it("returns the base count unchanged for the high (desktop) tier", () => {
      expect(tieredParticleCount(2200, "high")).toBe(2200);
    });

    it("scales the base count down for medium/low tiers, strictly decreasing with tier", () => {
      const high = tieredParticleCount(2200, "high");
      const medium = tieredParticleCount(2200, "medium");
      const low = tieredParticleCount(2200, "low");

      expect(medium).toBeLessThan(high);
      expect(low).toBeLessThan(medium);
    });

    it("never rounds a non-trivial base count down to zero (a floor keeps the field visually meaningful)", () => {
      expect(tieredParticleCount(10, "low")).toBeGreaterThan(0);
    });
  });
});
