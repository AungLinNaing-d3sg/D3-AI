"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getSiteAudioEnabled,
  initSiteAudio,
  playSiteSound,
  setSiteAudioEnabled,
  subscribeSiteAudio,
  type SiteSoundEvent,
} from "@/lib/audio/audioManager";

function getServerSnapshot(): boolean {
  return false;
}

export interface SiteAudio {
  /** Whether the visitor has turned site-wide sound on. Defaults to off —
   * see `lib/audio/audioManager.ts` for why. */
  enabled: boolean;
  /** Toggles the preference; turning it on lazily initializes Tone.js. */
  toggle: () => void;
  /** Fire-and-forget — no-ops if disabled/uninitialized/throttled. */
  play: (event: SiteSoundEvent) => void;
}

/**
 * The public entry point every component uses to trigger/toggle site audio —
 * same `useSyncExternalStore` shape as `useWebglSupported.ts`, so the
 * enabled flag is reconciled safely across server/client without a
 * hydration mismatch, and every consumer shares the exact same singleton
 * state (see `lib/audio/audioManager.ts`) rather than each holding its own.
 */
export function useSiteAudio(): SiteAudio {
  const enabled = useSyncExternalStore(subscribeSiteAudio, getSiteAudioEnabled, getServerSnapshot);

  const toggle = useCallback(() => {
    const next = !getSiteAudioEnabled();
    if (next) {
      setSiteAudioEnabled(true);
      // Tone.js loads/initializes asynchronously — wait for it so this
      // very first "Sound On" click also produces its own confirmation
      // chime, instead of silently no-op'ing because the engine wasn't
      // ready yet.
      void initSiteAudio().then(() => playSiteSound("select"));
    } else {
      // Turning off: play the confirmation while still enabled, then mute.
      playSiteSound("select");
      setSiteAudioEnabled(false);
    }
  }, []);

  return { enabled, toggle, play: playSiteSound };
}
