/** Shared types for mini-game 3/4 ("Neural Path"), split out so both the DOM
 * game logic (components/game/NeuralPathGame.tsx) and its decorative R3F
 * visuals (components/three/games/NeuralPathScene.tsx — kept under
 * `components/three/**` for that directory's imperative-mutation lint
 * carve-out, see eslint.config.mjs) can import them without a circular
 * dependency between the two. */

export interface PathNode {
  id: string;
  layer: number;
  label: string;
  correct: boolean;
  xPercent: number;
  yPercent: number;
}

export type NodeVisual = "locked" | "available" | "active-path" | "dormant" | "flash";
export type EdgeVisual = "ghost" | "available" | "active-path" | "dormant";

/** Pure derivation, shared by the DOM button grid and the decorative 3D
 * graph so a node's visual state can never drift out of sync between the
 * two (see CLAUDE.md "do not duplicate animation logic"). */
export function nodeVisual(node: PathNode, currentLayer: number, flashId: string | null): NodeVisual {
  if (node.id === flashId) return "flash";
  if (node.layer < currentLayer) return node.correct ? "active-path" : "dormant";
  if (node.layer === currentLayer) return "available";
  return "locked";
}

/** Same sharing rationale as `nodeVisual` above, for the edges connecting
 * consecutive layers. */
export function edgeVisual(from: PathNode, to: PathNode, currentLayer: number): EdgeVisual {
  if (from.layer < currentLayer && from.correct) {
    if (to.layer < currentLayer) return to.correct ? "active-path" : "dormant";
    if (to.layer === currentLayer) return "available";
  }
  return "ghost";
}
