"use client";

import { useEffect } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { initJourneyTimeline } from "@/lib/motion/scrollTimeline";
import { initPointerTracking } from "@/lib/motion/pointer";
import { STAGE_IDS, type StageId } from "@/types";

/**
 * Invisible controller that wires the DOM chapter elements
 * (`[data-stage]` inside `#experience-wrapper`, see `src/app/page.tsx`) to
 * the shared 3D journey timeline, plus whole-viewport pointer tracking for
 * camera parallax and node/panel micro-interactions. Rendered once at the
 * page root, alongside — but decoupled from — the actual `<SceneCanvas>`,
 * per the "separate 3D scenes from normal UI" requirement.
 */
export function ScrollChoreographer() {
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const stopPointerTracking = initPointerTracking();
    return stopPointerTracking;
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const wrapper = document.getElementById("experience-wrapper");
    if (!wrapper) return;

    let cleanup: (() => void) | undefined;
    // Defer a frame so fonts/layout have settled before chapter heights
    // (used to weight the scroll timeline) are measured.
    const raf = requestAnimationFrame(() => {
      const stageEls = STAGE_IDS.map((id) => {
        const el = document.querySelector<HTMLElement>(`[data-stage="${id}"]`);
        return el ? { id, el } : null;
      }).filter((entry): entry is { id: StageId; el: HTMLElement } => entry !== null);

      if (stageEls.length === STAGE_IDS.length) {
        cleanup = initJourneyTimeline(stageEls, wrapper);
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, [prefersReducedMotion]);

  return null;
}
