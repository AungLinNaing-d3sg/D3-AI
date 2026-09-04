/**
 * Converts a 2D percentage layout coordinate (0..100, same units the
 * accessible HTML hit-target buttons are positioned with via `left`/`top`
 * inline styles) into an approximate 3D world position for the matching
 * decorative mesh in one of the AI Playground mini-games (Signal Hunt,
 * Neural Path, Data Sort).
 *
 * Every playground mini-game keeps the *real* interaction on real HTML
 * `<button>`s layered over a small, self-contained, `aria-hidden` R3F canvas
 * — same "3D is decorative, HTML carries the interaction/accessibility"
 * split already used across the main journey (see three/scenes/AboutScene.tsx
 * team roster, three/scenes/ProductScene.tsx panels). This helper is what
 * keeps each decorative mesh visually near its real button without needing
 * full camera-projection math for a small, fixed-FOV mini-scene.
 */
export function percentToWorld(
  xPercent: number,
  yPercent: number,
  depth = 0,
  spreadX = 3.2,
  spreadY = 1.9
): [number, number, number] {
  const x = ((xPercent - 50) / 50) * spreadX;
  const y = -((yPercent - 50) / 50) * spreadY;
  return [x, y, depth];
}
