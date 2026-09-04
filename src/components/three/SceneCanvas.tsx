"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import { sceneState } from "@/lib/motion/sceneState";

const Experience = dynamic(() => import("@/components/three/Experience"), {
  ssr: false,
  loading: () => null,
});

/**
 * Fixed, full-viewport, decorative background canvas. Sits behind every
 * section (`z-0`, `pointer-events-none`) so page content always remains
 * readable and clickable above it; kept out of the accessibility tree since
 * it conveys no information that isn't already present as real HTML/text.
 *
 * On reduced-motion systems the WebGL scene is skipped entirely in favour of
 * a static gradient, per the "reduced-motion support" requirement.
 */
export function SceneCanvas() {
  const { enableScene, quality, prefersReducedMotion, isCompact } = useDeviceCapability();
  const vignetteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enableScene) return;
    let frame: number;

    const tick = () => {
      if (vignetteRef.current) {
        vignetteRef.current.style.opacity = String(sceneState.vignette);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [enableScene]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {enableScene ? (
        <Experience quality={quality} enableParallax={!isCompact && !prefersReducedMotion} />
      ) : (
        <div className="h-full w-full bg-[radial-gradient(circle_at_50%_20%,_#1a2233_0%,_#05070d_70%)]" />
      )}
      <div
        ref={vignetteRef}
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,_transparent_35%,_#05070d_100%)] opacity-15"
      />
    </div>
  );
}
