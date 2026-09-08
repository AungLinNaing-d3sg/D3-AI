import { journeyState } from "@/lib/motion/journeyState";

/**
 * Tracks the pointer across the whole viewport (not just inside the R3F
 * `<canvas>`) so both the 3D camera-parallax rig and DOM-level micro-
 * interactions (e.g. floating product panels) can react to the same value —
 * see `journeyState.pointer`. Raw + normalised only; smoothing/damping is
 * each consumer's own `useFrame` responsibility (see CameraRig).
 */
export function initPointerTracking(): () => void {
  if (typeof window === "undefined") return () => undefined;

  function onPointerMove(event: PointerEvent) {
    journeyState.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    journeyState.pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
  }

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  return () => window.removeEventListener("pointermove", onPointerMove);
}
