/**
 * Where the two spheres of the homepage background (SphereScene.tsx) rest
 * while each section is in view.
 *
 * Coordinates are viewport-relative so the composition survives any screen
 * size: `nx`/`ny` are fractions of the visible width/height at the object's
 * own depth (0 = centre, ±0.5 = the edge), `z` is depth (more negative =
 * further away and fainter), `s` is scale and `ry` a base Y rotation.
 *
 * Rule, enforced by __tests__/site/scenePoses.test.ts: every object is centred
 * in the outer side margins (|nx| ≥ 0.45) and kept clear of the header band,
 * so it never sits behind headings, body text or the navigation. The large
 * sphere always stays on the right and the accent on the left, so neither
 * ever sweeps across the reading column between sections.
 */

export const BACKGROUND_SECTIONS = ["hero", "about", "services", "process", "team", "faq", "contact"] as const;
export type BackgroundSection = (typeof BACKGROUND_SECTIONS)[number];

/** main = large pearl sphere · accent = small brand-red sphere */
export const BACKGROUND_OBJECTS = ["main", "accent"] as const;
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
  // Behind the hero demo cards, peeking out to their right.
  hero: {
    main: { nx: 0.45, ny: 0.04, z: -4, s: 2.1, ry: 0 },
    accent: { nx: -0.46, ny: -0.3, z: -4, s: 0.45, ry: 0 },
  },
  // Behind the phone.
  about: {
    main: { nx: 0.49, ny: 0.12, z: -4, s: 1.9, ry: 0.6 },
    accent: { nx: -0.47, ny: 0.24, z: -4, s: 0.4, ry: 0 },
  },
  services: {
    main: { nx: 0.5, ny: -0.12, z: -5, s: 2.1, ry: 1.2 },
    accent: { nx: -0.47, ny: -0.28, z: -4, s: 0.42, ry: 0 },
  },
  // Behind the step cards.
  process: {
    main: { nx: 0.49, ny: 0.16, z: -4, s: 1.9, ry: 1.8 },
    accent: { nx: -0.46, ny: -0.3, z: -4, s: 0.4, ry: 0 },
  },
  team: {
    main: { nx: 0.5, ny: -0.16, z: -5, s: 2.0, ry: 2.4 },
    accent: { nx: -0.47, ny: 0.26, z: -4, s: 0.4, ry: 0 },
  },
  faq: {
    main: { nx: 0.49, ny: 0.1, z: -4, s: 1.9, ry: 3 },
    accent: { nx: -0.46, ny: -0.3, z: -4, s: 0.42, ry: 0 },
  },
  // Beside the red contact panel.
  contact: {
    main: { nx: 0.5, ny: 0.2, z: -5, s: 2.1, ry: 3.6 },
    accent: { nx: -0.47, ny: -0.3, z: -4, s: 0.4, ry: 0 },
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
