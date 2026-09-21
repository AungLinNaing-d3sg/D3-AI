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
  /** Path (under `public/`) to this member's profile photo. */
  photo: string;
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

/**
 * The distinct 3D visual treatment ("station") each real statistic gets in
 * the Data Universe stage (chapter 04, "05" in the section's own UI numbering
 * — see `UniverseSection`'s eyebrow copy) — see
 * three/scenes/UniverseScene.tsx. Every variant communicates a different
 * concept rather than reusing one generic particle field four times:
 * - `location` — Singapore: particles gather into a small geographic/data
 *   hub cluster.
 * - `timeline` — 20+ years: a receding dimensional timeline of depth
 *   markers behind large 3D "20+" typography.
 * - `network` — Microsoft: a structured cube of technology nodes/blocks,
 *   evoking a connected platform.
 * - `impact` — Real-world: an irregular graph of project nodes with
 *   particles travelling between them.
 */
export type UniverseStationVariant = "location" | "timeline" | "network" | "impact";

/** One statistic paired with its 3D visual treatment — see
 * `UniverseStationVariant` above. */
export interface UniverseStation {
  stat: UniverseStat;
  variant: UniverseStationVariant;
}

/**
 * Chapter 06 — "AI ENGINEERING PLAYGROUND". The 4 real subagents defined in
 * `.claude/agents/*.md` that drive this repo's own AI development pipeline
 * (see src/components/game/AgentSelectExperience.tsx). Verbatim, real
 * responsibilities — not invented personas.
 */
export type AgentId = "senior-frontend-dev" | "senior-qa" | "senior-security-engineer" | "report-manager";

export interface AgentDefinition {
  id: AgentId;
  /** 1-based display order, matching `.claude/agents/*.md` reading order. */
  index: number;
  /** The agent's real subagent name (matches `claude --agent <name>`). */
  name: string;
  role: string;
  description: string;
  /** Real `tools:` frontmatter from the agent's own `.md` definition. */
  tools: string[];
  /** Short real access-scope summary (e.g. "Review-only · never edits or
   * commits") pulled from the agent's own description. */
  accessLabel: string;
  /** Drives this agent's node glow/accent, and the shared ambience particle
   * field behind the whole chapter (see lib/motion/playgroundState.ts). */
  accentHex: string;
}

/**
 * The real, fixed-order stages of `scripts/ai_workflow.sh`
 * (`STAGE_ORDER=(implement qa build commit-message commit push pr
 * report-manager security)`) — see
 * src/components/game/WorkflowRunExperience.tsx.
 */
export type WorkflowStageId =
  | "implement"
  | "qa"
  | "build"
  | "commit-message"
  | "commit"
  | "push"
  | "pr"
  | "report-manager"
  | "security";

/** Which of the brief's 5 flow labels (USER REQUEST → AI AGENT → WORKFLOW →
 * IMPLEMENTATION → VALIDATION) a given real stage maps onto. */
export type WorkflowFlowLabel = "USER REQUEST" | "AI AGENT" | "WORKFLOW" | "IMPLEMENTATION" | "VALIDATION";

export interface WorkflowStageDefinition {
  id: WorkflowStageId;
  /** 1-based execution order, matching `STAGE_ORDER` in `ai_workflow.sh`. */
  index: number;
  label: string;
  description: string;
  /** The real subagent this stage invokes, or `null` for stages that run
   * plain shell commands (build/commit/push/pr) without a subagent. */
  agentId: AgentId | null;
  /** A real, representative command/output line for this stage's terminal
   * log, or `null` when the stage has no single representative command. */
  command: string | null;
  flowLabel: WorkflowFlowLabel;
}

/**
 * Chapter 06 — "AI ENGINEERING PLAYGROUND". Four cohesive experiences that
 * visualise this repo's real AI agents + workflow — see
 * src/components/game/AiPlayground.tsx.
 */
export type PlaygroundExperienceId = "choose-agent" | "run-workflow" | "build-test" | "review-ship";

export interface PlaygroundExperienceDefinition {
  id: PlaygroundExperienceId;
  /** 1-based display order shown on the experience's own selector tile. */
  index: number;
  title: string;
  tagline: string;
  description: string;
  /** Drives both this experience's own accent glow and the shared ambience
   * particle field behind the whole chapter (see lib/motion/playgroundState.ts). */
  accentHex: string;
}

/** A forward-looking vision pillar for the Cinematic AI Future stage (07),
 * reframed from the real capability pillars in src/data/capabilities.ts. */
export interface VisionPillar {
  title: string;
  description: string;
}
