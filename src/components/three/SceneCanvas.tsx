"use client";

import dynamic from "next/dynamic";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";

const Experience = dynamic(() => import("@/components/three/Experience"), {
  ssr: false,
  loading: () => null,
});

/**
 * Fixed, full-viewport, decorative background canvas. Sits behind every
 * chapter (`z-0`, `pointer-events-none`, `aria-hidden`) so page content
 * always remains readable, clickable, and reachable above it. Every scene
 * rendered inside (see components/three/scenes/*) is purely visual — any
 * information it conveys (e.g. the AI Product Experience's floating panels)
 * is duplicated as real, focusable-free, accessible HTML in the matching
 * chapter section, never the other way round.
 *
 * On reduced-motion systems the WebGL scene is skipped entirely in favour of
 * a static gradient, per the "reduced-motion support" requirement.
 */
export function SceneCanvas() {
  const { enableScene, quality, prefersReducedMotion, isCompact } = useDeviceCapability();

  return (
    <div className="fixed inset-0 z-0" aria-hidden="true">
      {enableScene ? (
        <Experience quality={quality} enableParallax={!isCompact && !prefersReducedMotion} />
      ) : (
        <div className="h-full w-full bg-[radial-gradient(circle_at_50%_20%,_#1a2233_0%,_#05070d_70%)]" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,_transparent_35%,_#05070d_100%)] opacity-25" />
    </div>
  );
}
