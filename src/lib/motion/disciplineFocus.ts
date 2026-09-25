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
