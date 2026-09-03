"use client";

import { useEffect } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { initSceneScrollTimeline } from "@/lib/motion/scrollTimeline";

/**
 * Invisible controller that wires the DOM section elements
 * (`[data-scene-section]` inside `#experience-wrapper`, see
 * `src/app/page.tsx`) to the shared 3D scene timeline. Rendered once at the
 * page root, alongside — but decoupled from — the actual `<SceneCanvas>`,
 * per the "separate 3D scenes from normal UI" requirement.
 */
export function ScrollChoreographer() {
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const wrapper = document.getElementById("experience-wrapper");
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-scene-section]")
    );
    if (!wrapper || sections.length === 0) return;

    let cleanup: (() => void) | undefined;
    // Defer a frame so fonts/images have settled before section heights
    // (used to weight the scroll timeline) are measured.
    const raf = requestAnimationFrame(() => {
      cleanup = initSceneScrollTimeline(sections, wrapper);
    });

    return () => {
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, [prefersReducedMotion]);

  return null;
}
