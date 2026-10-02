/**
 * Where the three discipline objects of the homepage background
 * (DisciplineScene.tsx) rest while each section is in view.
 *
 * Coordinates are viewport-relative so the composition survives any screen
 * size: `nx`/`ny` are fractions of the visible width/height at the object's
 * own depth (0 = centre, ±0.5 = the edge), `z` is depth (more negative =
 * further away and fainter), `s` is scale and `ry` a base Y rotation.
 *
 * Rule, enforced by __tests__/site/scenePoses.test.ts: every object is centred
 * in the outer side margins (|nx| ≥ 0.45) and kept clear of the header band,
 * so it never sits behind headings, body text or the navigation.
 */

export const BACKGROUND_SECTIONS = ["hero", "about", "services", "process", "team", "faq", "contact"] as const;
export type BackgroundSection = (typeof BACKGROUND_SECTIONS)[number];

/** data = rising BI bars · flow = connected workflow nodes · device = app screen */
export const BACKGROUND_OBJECTS = ["data", "flow", "device"] as const;
export type BackgroundObject = (typeof BACKGROUND_OBJECTS)[number];

export interface Pose {
  nx: number;
  ny: number;
  z: number;
  s: number;
  ry: number;
}

export type SectionPoses = Record<BackgroundObject, Pose>;

export const SECTION_POSES: Record<BackgroundSection, SectionPoses> = {
  // Text left, demo cards right: objects sit in the outer margins only.
  hero: {
    data: { nx: 0.47, ny: 0.22, z: -4, s: 0.8, ry: -0.5 },
    flow: { nx: -0.47, ny: -0.3, z: -5, s: 0.75, ry: 0.4 },
    device: { nx: 0.46, ny: -0.36, z: -5, s: 0.7, ry: -0.35 },
  },
  // Text left, phone right.
  about: {
    data: { nx: -0.47, ny: 0.1, z: -5, s: 0.75, ry: 0.6 },
    flow: { nx: 0.47, ny: -0.3, z: -4, s: 0.8, ry: -0.5 },
    device: { nx: 0.48, ny: 0.3, z: -6, s: 0.65, ry: -0.3 },
  },
  // Full-width bento: everything goes to the margins.
  services: {
    data: { nx: -0.48, ny: 0.1, z: -4, s: 0.8, ry: 0.7 },
    flow: { nx: 0.48, ny: 0.25, z: -4, s: 0.8, ry: -0.6 },
    device: { nx: 0.47, ny: -0.32, z: -5, s: 0.7, ry: -0.5 },
  },
  // Sticky heading left, steps right.
  process: {
    data: { nx: -0.47, ny: -0.3, z: -4, s: 0.8, ry: 0.5 },
    flow: { nx: 0.48, ny: 0.3, z: -5, s: 0.75, ry: -0.4 },
    device: { nx: 0.47, ny: -0.3, z: -5, s: 0.7, ry: -0.6 },
  },
  team: {
    data: { nx: 0.47, ny: 0.3, z: -5, s: 0.75, ry: -0.5 },
    flow: { nx: -0.48, ny: -0.2, z: -4, s: 0.8, ry: 0.5 },
    device: { nx: 0.47, ny: -0.32, z: -5, s: 0.7, ry: -0.4 },
  },
  faq: {
    data: { nx: -0.47, ny: 0.25, z: -4, s: 0.8, ry: 0.6 },
    flow: { nx: 0.48, ny: -0.3, z: -4, s: 0.8, ry: -0.5 },
    device: { nx: -0.47, ny: -0.35, z: -6, s: 0.65, ry: 0.4 },
  },
  // The red panel fills the middle; objects sit beside it.
  contact: {
    data: { nx: -0.48, ny: 0.3, z: -4, s: 0.75, ry: 0.6 },
    flow: { nx: 0.48, ny: 0.3, z: -4, s: 0.75, ry: -0.6 },
    device: { nx: 0.47, ny: -0.35, z: -6, s: 0.65, ry: 0 },
  },
};

/**
 * Narrow screens have no side margins, so objects are pushed further out and
 * shrunk (by the tier's `objectScale`) to stay mostly off the text.
 */
export function poseFor(section: BackgroundSection, object: BackgroundObject, objectScale: number, compact: boolean): Pose {
  const pose = SECTION_POSES[section][object];
  if (!compact) return { ...pose, s: pose.s * objectScale };
  return { ...pose, nx: Math.sign(pose.nx || 1) * 0.6, s: pose.s * objectScale * 0.75 };
}
