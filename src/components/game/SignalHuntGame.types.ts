/** Shared types for mini-game 2/4 ("AI Signal Hunt"), split out so both the
 * DOM game logic (components/game/SignalHuntGame.tsx) and its decorative R3F
 * visuals (components/three/games/SignalHuntScene.tsx — kept under
 * `components/three/**` for that directory's imperative-mutation lint
 * carve-out, see eslint.config.mjs) can import them without a circular
 * dependency between the two. */

export type NodeKind = "signal" | "noise";
export type NodeStatus = "idle" | "correct" | "incorrect";

export interface SignalNode {
  id: string;
  kind: NodeKind;
  label: string;
  xPercent: number;
  yPercent: number;
  depth: number;
}
