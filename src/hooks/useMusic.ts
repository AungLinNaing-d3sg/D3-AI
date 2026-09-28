"use client";

import { useSyncExternalStore } from "react";
import {
  getMusicState,
  getServerMusicState,
  nextTrack,
  previousTrack,
  setMusicVolume,
  subscribeMusic,
  toggleMusic,
  toggleMusicPlayback,
  type MusicState,
} from "@/lib/audio/musicManager";

export interface Music extends MusicState {
  /** Music On/Off (saved). */
  toggle: () => void;
  /** Play/Pause in place. */
  togglePlayback: () => void;
  next: () => void;
  previous: () => void;
  /** 0..1 — ramps smoothly, no jumps. */
  setVolume: (volume: number) => void;
}

/**
 * The background music's one shared state and its controls (audio system B —
 * lib/audio/musicManager.ts), via `useSyncExternalStore`, so every consumer
 * reads the same global player and server/client reconcile without a
 * hydration mismatch.
 */
export function useMusic(): Music {
  const state = useSyncExternalStore(subscribeMusic, getMusicState, getServerMusicState);
  return {
    ...state,
    toggle: () => void toggleMusic(),
    togglePlayback: () => void toggleMusicPlayback(),
    next: () => void nextTrack(),
    previous: () => void previousTrack(),
    setVolume: setMusicVolume,
  };
}
