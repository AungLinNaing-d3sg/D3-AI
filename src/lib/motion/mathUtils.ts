/**
 * Small, dependency-free math helpers shared by the scroll-journey timeline
 * and every 3D scene. Centralised here so easing/interpolation logic is
 * written once (see CLAUDE.md "do not duplicate animation logic").
 */

/** Clamps `value` into the inclusive [min, max] range. */
export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

/** Linear interpolation between `a` and `b` by `t` (not clamped). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Smooth-step easing (0..1 in, 0..1 out) — used to soften scrub-driven
 * transitions instead of moving linearly with raw scroll progress. */
export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / Math.max(edge1 - edge0, 1e-6));
  return t * t * (3 - 2 * t);
}

/** Remaps `value` from [inMin, inMax] into [outMin, outMax], clamped. */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const t = clamp((value - inMin) / Math.max(inMax - inMin, 1e-6));
  return lerp(outMin, outMax, t);
}

/** Per-frame, framerate-independent damping (critically-damped-ish lerp).
 * `lambda` is roughly "how many times per second the gap halves". */
export function damp(current: number, target: number, lambda: number, delta: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * delta));
}
