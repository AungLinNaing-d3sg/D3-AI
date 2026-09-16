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
   * explicitly released. */
  pinned: number | null;
  /** `null` while no card is under the pointer; an index while the mouse is
   * actively hovering a card — cleared the instant the pointer leaves, no
   * release logic needed. Takes priority over `pinned` while set, so
   * hovering always gives immediate preview feedback even if a different
   * discipline is pinned. */
  hovered: number | null;
}

export const disciplineFocus: DisciplineFocusState = { pinned: null, hovered: null };

export function resetDisciplineFocus(): void {
  disciplineFocus.pinned = null;
  disciplineFocus.hovered = null;
}
