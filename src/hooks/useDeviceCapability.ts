"use client";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export interface DeviceCapability {
  /** OS-level "reduce motion" is on — the immersive Canvas is skipped
   * entirely in favour of a static decorative gradient. */
  prefersReducedMotion: boolean;
  /** Narrow/tablet viewport — the Canvas still renders, but with a lighter
   * particle count, lower pixel ratio, and no mouse-parallax layer. */
  isCompact: boolean;
  /** Whether the WebGL scene should mount at all. */
  enableScene: boolean;
  /** Relative quality tier used to size particle counts / DPR. */
  quality: "high" | "low";
}

/**
 * Central place that decides how much 3D the current device should render.
 * Keeps the "simplified mobile experience" and "reduced-motion support"
 * requirements in one auditable spot instead of scattered checks.
 */
export function useDeviceCapability(): DeviceCapability {
  const prefersReducedMotion = usePrefersReducedMotion();
  const isCompact = useMediaQuery("(max-width: 767px)");

  return {
    prefersReducedMotion,
    isCompact,
    enableScene: !prefersReducedMotion,
    quality: isCompact ? "low" : "high",
  };
}
