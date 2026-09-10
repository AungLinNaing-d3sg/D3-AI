/**
 * Central, auditable place that maps the 3 responsive quality tiers
 * (desktop / tablet / mobile — see `useDeviceCapability`'s `quality`) to the
 * concrete 3D-scene knobs every chapter scene reads from, instead of each
 * scene hand-rolling its own two-way high/low ternary — see CLAUDE.md
 * "reusable animation utilities" / "do not duplicate animation logic".
 *
 * Desktop keeps the full cinematic experience (more particles, deeper camera
 * travel, larger compositions); tablet gets a medium, simplified version;
 * mobile gets the lightest, most compact version so touch scrolling stays
 * smooth and content never goes outside the viewport.
 */
export type SceneQuality = "high" | "medium" | "low";

export interface SceneTierConfig {
  /** Multiplies every scene's base (desktop) particle count. */
  particleScale: number;
  /** Uniform scale applied to each chapter's root 3D group — shrinks both
   * object size and position spread so decorative geometry stays inside the
   * narrower mobile/tablet frustum instead of only resizing the canvas. */
  objectScale: number;
  /** Compresses camera/dolly Z-axis travel distance so mobile/tablet get a
   * shorter, cheaper dolly instead of the full cinematic depth (1 = full). */
  depthScale: number;
  /** [min, max] devicePixelRatio clamp for the shared `<Canvas>`. */
  dpr: [number, number];
}

export const SCENE_TIER_CONFIG: Record<SceneQuality, SceneTierConfig> = {
  high: { particleScale: 1, objectScale: 1, depthScale: 1, dpr: [1, 2] },
  medium: { particleScale: 0.55, objectScale: 0.85, depthScale: 0.72, dpr: [1, 1.5] },
  low: { particleScale: 0.32, objectScale: 0.66, depthScale: 0.5, dpr: [1, 1] },
};

/** Rounds a base (desktop) particle count down for the given quality tier —
 * the one place every scene's particle-count ternary should read from, so
 * tuning particle budgets stays a single-source-of-truth exercise. */
export function tieredParticleCount(baseHighCount: number, quality: SceneQuality): number {
  return Math.max(24, Math.round(baseHighCount * SCENE_TIER_CONFIG[quality].particleScale));
}
