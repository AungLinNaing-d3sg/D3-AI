import { STAGE_IDS, type CameraKeyframe, type LightKeyframe, type StageId } from "@/types";

/**
 * Shared, mutable "journey state" driven by scroll and read every frame by
 * the R3F scene (see components/three/scenes/*). Kept as a plain JS
 * singleton — rather than React state — because it changes up to 60 times a
 * second while scrubbing and must never trigger a React re-render; the
 * scroll timeline writes into it directly and `useFrame` consumers read from
 * it imperatively. See lib/motion/scrollTimeline.ts for the writer.
 */

export interface JourneyPointer {
  /** Normalised device pointer, -1..1, smoothed by consumers (not here). */
  x: number;
  y: number;
}

/** A stage's real document position, expressed in the same 0..1
 * `globalProgress` space — used by the global scroll-progress rail
 * (components/layout/ScrollProgressRail.tsx) to place its tick marks/labels
 * accurately without re-measuring the DOM itself. */
export interface StageBounds {
  start: number;
  end: number;
}

export interface JourneyState {
  /** 0..1 across the entire experience. Drives the top progress rail. */
  globalProgress: number;
  /** The stage currently most "in focus" (highest crossfade weight). */
  activeStage: StageId;
  /** Each stage's own local scroll progress, 0 (just entered) .. 1 (about to
   * leave). Stages read their own slice to drive internal choreography. */
  progress: Record<StageId, number>;
  /** Crossfade visibility per stage, 0..1, with soft overlap at the edges so
   * one scene visually dissolves into the next rather than cutting. */
  weight: Record<StageId, number>;
  /** Each stage's real `[start, end]` in whole-page `globalProgress` space —
   * see `StageBounds` above. */
  stageBounds: Record<StageId, StageBounds>;
  /** The single continuous camera, flown through every stage in sequence. */
  camera: CameraKeyframe;
  /** The single continuous lighting rig. */
  light: LightKeyframe;
  pointer: JourneyPointer;
}

function zeroRecord(): Record<StageId, number> {
  return STAGE_IDS.reduce(
    (acc, id) => {
      acc[id] = 0;
      return acc;
    },
    {} as Record<StageId, number>
  );
}

/** Evenly-spaced placeholder bounds, used until the real scroll timeline's
 * first `measure()` pass (see lib/motion/scrollTimeline.ts) overwrites these
 * with each stage's real document position. */
function evenStageBounds(): Record<StageId, StageBounds> {
  const count = STAGE_IDS.length;
  return STAGE_IDS.reduce(
    (acc, id, index) => {
      acc[id] = { start: index / count, end: (index + 1) / count };
      return acc;
    },
    {} as Record<StageId, StageBounds>
  );
}

export const restCamera: CameraKeyframe = {
  x: 0,
  y: 0.3,
  z: 8,
  lookX: 0,
  lookY: 0,
  lookZ: 0,
  fov: 45,
};

export const restLight: LightKeyframe = {
  ambient: 0.5,
  key: 1.1,
  rim: 0.5,
  colorHex: "#6c7897",
};

export const journeyState: JourneyState = {
  globalProgress: 0,
  activeStage: "intro",
  progress: zeroRecord(),
  weight: { ...zeroRecord(), intro: 1 },
  stageBounds: evenStageBounds(),
  camera: { ...restCamera },
  light: { ...restLight },
  pointer: { x: 0, y: 0 },
};

/** Resets the singleton back to its resting (intro) state — used when the
 * scroll-driven timeline is torn down (e.g. reduced-motion toggled on, or on
 * unmount). */
export function resetJourneyState() {
  journeyState.globalProgress = 0;
  journeyState.activeStage = "intro";
  journeyState.progress = zeroRecord();
  journeyState.weight = { ...zeroRecord(), intro: 1 };
  journeyState.stageBounds = evenStageBounds();
  Object.assign(journeyState.camera, restCamera);
  Object.assign(journeyState.light, restLight);
}
