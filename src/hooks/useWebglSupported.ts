"use client";

import { useSyncExternalStore } from "react";

function detectWebglSupport(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** WebGL support never changes over a page's lifetime, so this is computed
 * (and cached) once on first read rather than re-checked on every call. */
let cachedSupport: boolean | null = null;

function getSnapshot(): boolean {
  if (cachedSupport === null) cachedSupport = detectWebglSupport();
  return cachedSupport;
}

/** Nothing to subscribe to — support never changes after the initial check —
 * so this never notifies `useSyncExternalStore` of an update. */
function subscribe(): () => void {
  return () => undefined;
}

/**
 * Detects real WebGL context-creation support, separately from the
 * `prefers-reduced-motion` check `useDeviceCapability` already covers — a
 * handful of environments (very old browsers, locked-down enterprise
 * machines, exhausted WebGL contexts) can't create a WebGL context at all,
 * and mounting the R3F `<Canvas>` there would otherwise throw or render a
 * blank rectangle instead of gracefully falling back to the same static
 * gradient `SceneCanvas` already shows reduced-motion users.
 *
 * Built on `useSyncExternalStore` (the same primitive `useMediaQuery` uses)
 * rather than `useState`/`useEffect`, so the server snapshot (`true` — no
 * `window`/`document` there, and this must match today's default behaviour)
 * and the client's real, cached check are reconciled safely without ever
 * causing a hydration mismatch.
 */
export function useWebglSupported(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
