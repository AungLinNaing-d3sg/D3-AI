/**
 * Small, mutable singleton — same pattern as `lib/motion/journeyState.ts` —
 * that lets the DOM-driven "AI Engineering Playground"
 * (components/game/AiPlayground.tsx and its 4 experiences) tell the shared
 * background 3D canvas (three/scenes/GameAmbienceScene.tsx) which experience
 * — or, within it, which real agent/workflow stage — is currently in focus,
 * without routing every keystroke/click through React re-renders or standing
 * up a second, parallel animation/state system. `useFrame` consumers read
 * this imperatively, exactly like `journeyState`.
 */

export interface PlaygroundState {
  /** Hex colour of the currently focused experience/agent/stage (see
   * data/journey.ts `playgroundExperiences`/`AGENTS`), lerped into the
   * ambience particle field's colour. */
  accentHex: string;
}

export const DEFAULT_PLAYGROUND_ACCENT = "#fcd34d";

export const playgroundState: PlaygroundState = {
  accentHex: DEFAULT_PLAYGROUND_ACCENT,
};

/** Called by `AiPlayground` (or a nested experience) whenever the focused
 * experience/agent/stage changes. */
export function setPlaygroundAccent(hex: string) {
  playgroundState.accentHex = hex;
}

/** Called when the playground menu is shown / the chapter is left, so the
 * ambience field eases back to its neutral resting colour. */
export function resetPlaygroundAccent() {
  playgroundState.accentHex = DEFAULT_PLAYGROUND_ACCENT;
}
