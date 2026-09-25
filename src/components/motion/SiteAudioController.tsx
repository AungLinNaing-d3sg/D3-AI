"use client";

import { useEffect, useRef } from "react";
import { useJourneyFrame } from "@/hooks/useJourneyFrame";
import { getSiteAudioEnabled, initSiteAudio, playSiteSound } from "@/lib/audio/audioManager";
import type { StageId } from "@/types";

/**
 * Invisible, root-mounted controller (same convention as
 * `components/motion/ScrollChoreographer.tsx`) with two jobs:
 *
 * 1. Re-unlocks Tone.js on the first real user gesture of a fresh page load
 *    when the visitor already turned sound on earlier this session (see
 *    `lib/audio/audioManager.ts` — the preference persists via
 *    `sessionStorage`, but every page load still needs its own real gesture
 *    before the browser will let a *new* `AudioContext` produce sound).
 *    Never runs `initSiteAudio()` on its own initiative otherwise — a first
 *    click from a visitor who has never enabled sound stays silent.
 * 2. Fires one "stage-enter" sound whenever the scroll-driven
 *    `journeyState.activeStage` changes — the single site-wide hook for
 *    "audio synced to entering every chapter", reusing the exact
 *    `useJourneyFrame` + ref-diffing pattern `components/layout/Header.tsx`
 *    already uses for its nav active-pill. Automatically inert under
 *    `prefers-reduced-motion`, since `useJourneyFrame` itself never starts
 *    its rAF loop in that case.
 */
export function SiteAudioController() {
  const lastActiveStage = useRef<StageId | null>(null);

  useEffect(() => {
    if (typeof document === "undefined" || !getSiteAudioEnabled()) return;

    const unlock = () => {
      void initSiteAudio();
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
    };

    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);

    return () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
    };
  }, []);

  useJourneyFrame((state) => {
    const isFirstRead = lastActiveStage.current === null;
    if (state.activeStage === lastActiveStage.current) return;
    lastActiveStage.current = state.activeStage;
    // Skip the very first read (arriving already "at" the hero on mount) —
    // only real transitions between chapters should sound.
    if (isFirstRead) return;
    playSiteSound("stage-enter");
  });

  return null;
}
