/**
 * Shared, mutable "scene state" driven by scroll and read every frame by the
 * R3F scene (see components/three/*). Kept as a plain JS singleton — rather
 * than React state — because it changes up to 60 times a second while
 * scrubbing and must never trigger a React re-render; GSAP tweens its
 * numeric leaves directly and `useFrame` consumers read from it imperatively.
 *
 * The 8 keyframes below map 1:1 to the 8 homepage sections in
 * `src/app/page.tsx` (hero → about → services → solutions → projects →
 * technology → company → cta) and describe the full scroll-driven "camera
 * flight" through the scene.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface SceneState {
  camera: {
    x: number;
    y: number;
    z: number;
    lookX: number;
    lookY: number;
    lookZ: number;
    fov: number;
  };
  core: {
    scale: number;
    distort: number;
    rotationSpeed: number;
    color: RGB;
  };
  particles: {
    spread: number;
    opacity: number;
  };
  nodes: {
    radius: number;
    opacity: number;
    lineOpacity: number;
  };
  light: {
    ambient: number;
    point: number;
  };
  vignette: number;
}

function rgb(hex: string): RGB {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}

/** One keyframe per homepage section, in document order. */
export const sceneKeyframes: SceneState[] = [
  // 0. Hero — wide establishing shot, calm idle rotation.
  {
    camera: { x: 0, y: 0.4, z: 7, lookX: 0, lookY: 0, lookZ: 0, fov: 45 },
    core: { scale: 1.1, distort: 0.4, rotationSpeed: 0.15, color: rgb("#4a7ba6") },
    particles: { spread: 6, opacity: 0.5 },
    nodes: { radius: 2, opacity: 0, lineOpacity: 0 },
    light: { ambient: 0.6, point: 1.2 },
    vignette: 0.15,
  },
  // 1. About — camera drifts left, warms up as the company story begins.
  {
    camera: { x: -2.2, y: 0.2, z: 5.6, lookX: 0.4, lookY: 0, lookZ: 0, fov: 45 },
    core: { scale: 0.85, distort: 0.22, rotationSpeed: 0.08, color: rgb("#fd6a50") },
    particles: { spread: 4, opacity: 0.32 },
    nodes: { radius: 2, opacity: 0, lineOpacity: 0 },
    light: { ambient: 0.55, point: 1.0 },
    vignette: 0.2,
  },
  // 2. Services — three nodes emerge around the core, representing the
  // three real service pillars.
  {
    camera: { x: 2.4, y: 0.6, z: 5, lookX: 0, lookY: 0.2, lookZ: 0, fov: 45 },
    core: { scale: 0.6, distort: 0.5, rotationSpeed: 0.25, color: rgb("#f14a30") },
    particles: { spread: 5, opacity: 0.4 },
    nodes: { radius: 2.2, opacity: 0.85, lineOpacity: 0.3 },
    light: { ambient: 0.55, point: 1.3 },
    vignette: 0.18,
  },
  // 3. Solutions — nodes connect into a fuller network.
  {
    camera: { x: 0, y: 1.2, z: 4.2, lookX: 0, lookY: 0, lookZ: 0, fov: 45 },
    core: { scale: 0.5, distort: 0.6, rotationSpeed: 0.3, color: rgb("#6366f1") },
    particles: { spread: 6, opacity: 0.5 },
    nodes: { radius: 2.6, opacity: 1, lineOpacity: 0.6 },
    light: { ambient: 0.5, point: 1.4 },
    vignette: 0.16,
  },
  // 4. Projects — camera glides past the network as focus areas cycle.
  {
    camera: { x: -2.6, y: 0.4, z: 4.6, lookX: 0.2, lookY: 0, lookZ: 0.2, fov: 45 },
    core: { scale: 0.55, distort: 0.45, rotationSpeed: 0.2, color: rgb("#fd6a50") },
    particles: { spread: 5.5, opacity: 0.45 },
    nodes: { radius: 2.4, opacity: 0.9, lineOpacity: 0.5 },
    light: { ambient: 0.5, point: 1.3 },
    vignette: 0.18,
  },
  // 5. Technology — pulled back to reveal the full ecosystem graph.
  {
    camera: { x: 0, y: 0, z: 6.5, lookX: 0, lookY: 0, lookZ: 0, fov: 48 },
    core: { scale: 0.4, distort: 0.3, rotationSpeed: 0.35, color: rgb("#22d3ee") },
    particles: { spread: 7.5, opacity: 0.6 },
    nodes: { radius: 3.2, opacity: 1, lineOpacity: 0.8 },
    light: { ambient: 0.45, point: 1.5 },
    vignette: 0.12,
  },
  // 6. Company/Team — technology settles, warms into a human tone.
  {
    camera: { x: 1.8, y: 0.3, z: 5.2, lookX: -0.2, lookY: 0, lookZ: 0, fov: 45 },
    core: { scale: 0.7, distort: 0.15, rotationSpeed: 0.1, color: rgb("#f59e0b") },
    particles: { spread: 3, opacity: 0.2 },
    nodes: { radius: 2.6, opacity: 0.3, lineOpacity: 0.15 },
    light: { ambient: 0.65, point: 1.1 },
    vignette: 0.22,
  },
  // 7. Final CTA — minimal, centred, a single glowing focal point.
  {
    camera: { x: 0, y: 0, z: 5.2, lookX: 0, lookY: 0, lookZ: 0, fov: 42 },
    core: { scale: 0.9, distort: 0.08, rotationSpeed: 0.06, color: rgb("#f14a30") },
    particles: { spread: 1.5, opacity: 0.1 },
    nodes: { radius: 2, opacity: 0, lineOpacity: 0 },
    light: { ambient: 0.35, point: 1.8 },
    vignette: 0.4,
  },
];

function cloneSceneState(state: SceneState): SceneState {
  return JSON.parse(JSON.stringify(state)) as SceneState;
}

/** The live, mutable scene state read every frame inside the Canvas. */
export const sceneState: SceneState = cloneSceneState(sceneKeyframes[0] as SceneState);

/** Resets the singleton back to its resting (hero) keyframe — used when the
 * scroll-driven timeline is torn down (e.g. reduced-motion toggled on). */
export function resetSceneState() {
  const rest = cloneSceneState(sceneKeyframes[0] as SceneState);
  Object.assign(sceneState.camera, rest.camera);
  Object.assign(sceneState.core, rest.core);
  Object.assign(sceneState.particles, rest.particles);
  Object.assign(sceneState.nodes, rest.nodes);
  Object.assign(sceneState.light, rest.light);
  sceneState.vignette = rest.vignette;
}
