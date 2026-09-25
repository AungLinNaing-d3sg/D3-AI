/** Shared types for experience 3/4 ("Build & Test"), split out so both the
 * DOM experience logic (components/game/BuildTestExperience.tsx) and its
 * decorative R3F visuals (components/three/experiences/DevCoreScene.tsx —
 * kept under `components/three/**` for that directory's imperative-mutation
 * lint carve-out, see eslint.config.mjs) can import them without a circular
 * dependency between the two. */

/** Mirrors the brief's real status sequence: ANALYZING → IMPLEMENTING →
 * TESTING → FIXING → VERIFIED, plus an initial idle state before Run. */
export type BuildTestStatus = "idle" | "analyzing" | "implementing" | "testing" | "fixing" | "verified";
