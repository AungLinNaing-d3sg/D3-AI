import { clamp, smoothstep } from "@/lib/motion/mathUtils";

/**
 * Tiny, section-scoped mutable singleton — which discipline (0=Data,
 * 1=Dynamics, 2=Digital) the user last clicked in the "Built from Real
 * Disciplines" chapter (components/sections/TypographySection.tsx), read
 * every frame by its 3D scene (three/scenes/TypographyScene.tsx). Kept as
 * its own tiny file rather than added to the shared `journeyState` singleton
 * (lib/motion/journeyState.ts) since only this one chapter needs it — a
 * plain JS object for the same reason `journeyState` is: it changes on
 * click/scroll and must never trigger a React re-render.
 */
export interface DisciplineFocusState {
  /** `null` while scroll has control; an index while a click has "pinned"
   * that discipline — see the release-on-scroll logic in
   * `TypographyScene.tsx`. Persists across mouse movement/scroll until
   * explicitly released. Hovering a card deliberately never changes the
   * active discipline — only scroll and a click do. */
  pinned: number | null;
}

export const disciplineFocus: DisciplineFocusState = { pinned: null };

export function resetDisciplineFocus(): void {
  disciplineFocus.pinned = null;
}

/**
 * How "in focus" discipline `index` is (0..1) at the chapter's local scroll
 * progress, with a click pin forcing it to 1 — a soft rise/fall per third
 * rather than a hard cut at each boundary. The single shared curve read by
 * both the sphere (three/scenes/TypographyScene.tsx: cluster highlight,
 * turn and dolly) and the HTML cards (TypographySection.tsx: lift toward
 * the viewer, prominence), so card and sphere always move together.
 */
export function disciplineActivity(local: number, index: number, count: number, pinned: number | null): number {
  if (pinned === index) return 1;
  const start = index / count;
  const span = Math.max(1 / count, 0.0001);
  const t = clamp((local - start) / span);
  return smoothstep(0, 0.3, t) * (1 - smoothstep(0.7, 1, t));
}
