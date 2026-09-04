/** Shared types for mini-game 4/4 ("Data Sort"), split out so both the DOM
 * game logic (components/game/DataSortGame.tsx) and its decorative R3F
 * visuals (components/three/games/DataSortScene.tsx — kept under
 * `components/three/**` for that directory's imperative-mutation lint
 * carve-out, see eslint.config.mjs) can import them without a circular
 * dependency between the two. */

export type ObjectKind = "data" | "knowledge" | "signal" | "noise" | "error";
export type Zone = "process" | "discard";
export type ObjectStatus = "idle" | "selected" | "resolved" | "flash";

export interface DataObject {
  id: string;
  kind: ObjectKind;
  label: string;
  positive: boolean;
  xPercent: number;
  yPercent: number;
  depth: number;
}

export interface ZoneMarker {
  xPercent: number;
  yPercent: number;
}
