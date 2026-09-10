"use client";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { SceneQuality } from "@/lib/three/deviceTiers";

/** The 3 responsive device tiers the whole scrollytelling experience is
 * authored against (see `src/lib/three/deviceTiers.ts`) — mobile <768px,
 * tablet 768–1023px, desktop >=1024px, matching the `md`/`lg` Tailwind
 * breakpoints every chapter `Section` uses for its own responsive
 * min-height/pin behaviour. */
export type DeviceTier = "mobile" | "tablet" | "desktop";

export interface DeviceCapability {
  /** OS-level "reduce motion" is on — the immersive Canvas is skipped
   * entirely in favour of a static decorative gradient. */
  prefersReducedMotion: boolean;
  /** Narrow/mobile viewport (<768px) — the Canvas still renders, but with
   * the lightest particle count, lowest pixel ratio, smallest object scale,
   * and shortest camera travel. Kept for existing call sites; equivalent to
   * `tier === "mobile"`. */
  isCompact: boolean;
  /** Tablet viewport (768–1023px) — medium particle count/object scale and
   * reduced camera travel, distinct from both the full desktop experience
   * and the minimal mobile one. */
  isTablet: boolean;
  /** Coarse/touch primary pointer (`(pointer: coarse)`), independent of
   * viewport width — used to gate expensive mouse-parallax effects, which
   * should never depend on a pointer touch devices don't have. */
  hasCoarsePointer: boolean;
  /** The 3 responsive device tiers — see `DeviceTier` above. */
  tier: DeviceTier;
  /** Whether the WebGL scene should mount at all. */
  enableScene: boolean;
  /** Relative quality tier used to size particle counts / DPR / object
   * scale / camera depth — see `src/lib/three/deviceTiers.ts`. */
  quality: SceneQuality;
}

/**
 * Central place that decides how much 3D the current device should render.
 * Keeps the "simplified mobile/tablet experience" and "reduced-motion
 * support" requirements in one auditable spot instead of scattered checks —
 * see `src/lib/three/deviceTiers.ts` for what each tier actually changes.
 */
export function useDeviceCapability(): DeviceCapability {
  const prefersReducedMotion = usePrefersReducedMotion();
  const isCompact = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const hasCoarsePointer = useMediaQuery("(pointer: coarse)");

  const tier: DeviceTier = isCompact ? "mobile" : isTablet ? "tablet" : "desktop";
  const quality: SceneQuality = isCompact ? "low" : isTablet ? "medium" : "high";

  return {
    prefersReducedMotion,
    isCompact,
    isTablet,
    hasCoarsePointer,
    tier,
    enableScene: !prefersReducedMotion,
    quality,
  };
}
