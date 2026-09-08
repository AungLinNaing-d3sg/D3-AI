"use client";

import { useEffect, useRef } from "react";
import { journeyState, type JourneyState } from "@/lib/motion/journeyState";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Subscribes a callback to a `requestAnimationFrame` loop that reads the
 * shared scroll-driven `journeyState` singleton (see
 * lib/motion/journeyState.ts) — the DOM/HTML equivalent of a 3D scene's
 * `useFrame`. Used by chapter sections to sync captions, active-panel
 * highlighting, etc. to the same scroll timeline the 3D scenes read from,
 * without a second `ScrollTrigger` and without triggering a React
 * re-render every frame (callers mutate refs/styles directly).
 *
 * The callback is kept in a ref so passing a fresh inline function each
 * render doesn't tear down and restart the rAF loop. Entirely inert when
 * the user prefers reduced motion — the loop never starts, and callers
 * should render a static, fully-visible fallback in that case.
 */
export function useJourneyFrame(callback: (state: JourneyState) => void, enabled = true): void {
  const prefersReducedMotion = usePrefersReducedMotion();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || prefersReducedMotion) return;

    let frame: number;
    const tick = () => {
      callbackRef.current(journeyState);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [enabled, prefersReducedMotion]);
}
