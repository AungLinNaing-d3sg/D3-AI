"use client";

import { useEffect } from "react";
import { getSiteAudioEnabled, initSiteAudio } from "@/lib/audio/audioManager";

/**
 * Invisible, root-mounted controller (same convention as
 * `components/motion/ScrollChoreographer.tsx`) that re-unlocks Tone.js on
 * the first real user gesture of a fresh page load when the visitor already
 * turned sound on earlier this session (see `lib/audio/audioManager.ts` —
 * the preference persists via `sessionStorage`, but every page load still
 * needs its own real gesture before the browser will let a *new*
 * `AudioContext` produce sound). Never runs `initSiteAudio()` on its own
 * initiative otherwise — a first click from a visitor who has never enabled
 * sound stays silent. Scrolling between chapters makes no sound.
 */
export function SiteAudioController() {
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

  return null;
}
