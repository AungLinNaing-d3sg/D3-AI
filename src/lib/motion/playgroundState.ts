/**
 * Small, mutable singleton — same pattern as `lib/motion/journeyState.ts` —
 * that lets the DOM-driven "AI Engineering Playground"
 * (components/game/AiPlayground.tsx and its 4 experiences) tell the shared
 * background 3D canvas (three/scenes/GameAmbienceScene.tsx) what the
 * playground is doing, without routing every keystroke/click through React
 * re-renders or standing up a second, parallel animation/state system.
 * `useFrame` consumers read this imperatively, exactly like `journeyState`.
 *
 * It is write-only from the game's side: the experiences report what they
 * are already doing (see hooks/usePlaygroundSignals.ts); nothing here feeds
 * back into game logic.
 */

export type PlaygroundSignal = "select" | "success" | "failure";

export interface PlaygroundState {
  /** Hex colour of the currently focused experience/agent/stage (see
   * data/journey.ts `playgroundExperiences`/`AGENTS`), which lightly tints
   * the background network's activity. */
  accentHex: string;
  /** How busy the playground is, 0..1: 0 on the entry menu, low while an
   * experience waits to start, 1 while one is running. The background
   * eases toward it. */
  activity: number;
  /** `performance.now()` of the most recent event of each kind (0 = never)
   * — the background plays a short, restrained response to each and then
   * settles back on its own. */
  signals: Record<PlaygroundSignal, number>;
}

export const DEFAULT_PLAYGROUND_ACCENT = "#fcd34d";

export const playgroundState: PlaygroundState = {
  accentHex: DEFAULT_PLAYGROUND_ACCENT,
  activity: 0,
  signals: { select: 0, success: 0, failure: 0 },
};

/** Called by `AiPlayground` (or a nested experience) whenever the focused
 * experience/agent/stage changes. */
export function setPlaygroundAccent(hex: string) {
  playgroundState.accentHex = hex;
}

/** Called when the playground menu is shown / the chapter is left, so the
 * ambience eases back to its neutral resting colour. */
export function resetPlaygroundAccent() {
  playgroundState.accentHex = DEFAULT_PLAYGROUND_ACCENT;
}

export function setPlaygroundActivity(level: number) {
  playgroundState.activity = Math.min(1, Math.max(0, level));
}

/** Marks a moment (an agent chosen, a run completing, a test failing) for
 * the background to respond to. */
export function signalPlayground(signal: PlaygroundSignal) {
  playgroundState.signals[signal] = typeof performance !== "undefined" ? performance.now() : Date.now();
}
