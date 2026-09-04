import type { Route } from "next";

/** A single navigation entry rendered in the header/footer. In-page section
 * links use a `#hash` href; typedRoutes only validates pathnames, so a hash
 * suffix on the root route stays type-safe. */
export interface NavItem {
  href: Route | `#${string}`;
  label: string;
}

/** Icon identifiers rendered by <ServiceIcon />. A union (rather than
 * `string`) means adding a new service can't silently reference a missing
 * icon. */
export type ServiceIconName = "data" | "dynamics" | "digital";

export interface Service {
  slug: string;
  icon: ServiceIconName;
  title: string;
  summary: string;
  bullets: string[];
}

/** A capability/solution narrative built from the same real service data,
 * reframed around how engagements are delivered rather than what is sold. */
export interface Capability {
  slug: string;
  title: string;
  summary: string;
  points: string[];
}

/** A focus area shown in the Projects/Portfolio section. Deliberately not a
 * fabricated case study (no invented client names, logos, or metrics) —
 * see src/data/focusAreas.ts for sourcing notes. */
export interface FocusArea {
  slug: string;
  title: string;
  description: string;
  outcomes: string[];
}

/** A node in the technology ecosystem graph rendered in both the 3D scene
 * and the accessible fallback list. */
export interface TechNode {
  id: string;
  label: string;
  category: "Platform" | "Data & AI" | "Applications" | "Delivery";
}

export interface TeamMember {
  name: string;
  role: string;
  initials: string;
  bio: string[];
}

export interface BrandPillar {
  label: string;
  value: string;
  description: string;
}

/**
 * The 9 chapters of the scroll-driven journey (see src/app/page.tsx and
 * lib/motion/journeyState.ts). Order matters — it is both document order and
 * camera/timeline order. "about" (chapter 02 — Who we are) sits right after
 * the cinematic intro and before the more technical Data/Dynamics/Digital
 * chapters, mirroring the existing site's Home → About Us → Our Services
 * navigation order (see /docs/AboutUs.png).
 */
export const STAGE_IDS = [
  "intro",
  "about",
  "typography",
  "neural",
  "universe",
  "product",
  "game",
  "future",
  "cta",
] as const;

export type StageId = (typeof STAGE_IDS)[number];

/** A single "camera flight" waypoint. `fov` in degrees. */
export interface CameraKeyframe {
  x: number;
  y: number;
  z: number;
  lookX: number;
  lookY: number;
  lookZ: number;
  fov: number;
}

/** A lighting waypoint — colour temperature + intensities the rig lerps
 * between as the journey moves from stage to stage. */
export interface LightKeyframe {
  ambient: number;
  key: number;
  rim: number;
  colorHex: string;
}

/** One labelled concept node in the Neural Network stage (chapter 03). */
export interface ConceptNode {
  id: string;
  label: string;
  /** Unit-sphere-ish position, scaled by the scene at render time. */
  position: [number, number, number];
}

/** A short, real, sourced statistic surfaced as particle-formed text in the
 * Data Universe stage (chapter 04). */
export interface UniverseStat {
  token: string;
  label: string;
  description: string;
}

/** A floating product panel in the AI Product Experience stage (05),
 * sourced 1:1 from src/data/services.ts. */
export interface ProductPanel {
  slug: string;
  eyebrow: string;
  title: string;
  summary: string;
  bullets: string[];
}

/** "TRAIN YOUR AI" mini-game (chapter 06) item classification. */
export type GameItemKind = "data" | "knowledge" | "experience" | "noise" | "error" | "bias";

export interface GameItemDefinition {
  kind: GameItemKind;
  label: string;
  /** Positive items raise the trained model's accuracy, negative items
   * lower it. */
  polarity: "positive" | "negative";
}

/** A forward-looking vision pillar for the Cinematic AI Future stage (07),
 * reframed from the real capability pillars in src/data/capabilities.ts. */
export interface VisionPillar {
  title: string;
  description: string;
}
