import type {
  ConceptNode,
  GameItemDefinition,
  PlaygroundGameDefinition,
  ProductPanel,
  UniverseStat,
  VisionPillar,
} from "@/types";
import { services } from "@/data/services";
import { capabilities } from "@/data/capabilities";
import { brandPillars } from "@/data/pillars";
import { techNodes } from "@/data/technology";
import { teamMembers } from "@/data/team";

/**
 * Chapter 02 — About Us / Who we are. The leadership team (src/data/team.ts,
 * sourced from the existing About Us page copy — see /docs/AboutUs.png) is
 * rendered as orbiting "identity nodes" around a central emblem in the 3D
 * scene (three/scenes/AboutScene.tsx); positions are evenly distributed
 * around the emblem rather than hand-placed, same approach as the neural
 * network's secondary nodes below.
 */
export const aboutTeamNodes: ConceptNode[] = teamMembers.map((member, index) => {
  const angle = (index / teamMembers.length) * Math.PI * 2;
  const radius = 2.1;
  return {
    id: member.initials,
    label: member.initials,
    position: [Math.cos(angle) * radius, Math.sin(angle * 1.4) * 0.5, Math.sin(angle) * radius * 0.6],
  };
});

/** Even scroll-progress ranges for each team member above, shared by the 3D
 * orbiting-node highlight and the DOM team-card highlight so both read from
 * the same single source of truth — same pattern as `universeStatRanges`. */
export const aboutTeamRanges = teamMembers.map((member, index) => ({
  member,
  start: index / teamMembers.length,
  end: (index + 1) / teamMembers.length,
}));

/** Short, sourced continuation of the "Who we are" narrative — the one
 * sentence from the existing About Us page copy (/docs/AboutUs.png) not yet
 * carried elsewhere: working alongside delivery partners to cover the full
 * breadth of a client's IT transformation. */
export const aboutPartnerNote =
  "Working alongside partners who offer complementary or value-added services, so we can serve your organisation's varied IT transformation needs.";

/**
 * Chapter 03 — 3D AI Typography. The word sequence particles form/explode/
 * reform through, grounded in the company's own name and three real
 * service pillars (src/data/services.ts) rather than generic buzzwords,
 * ending on "AI" as the bridge into the Neural Network chapter.
 */
export const typographyWords = ["D3-SG", "DATA", "DYNAMICS", "DIGITAL", "AI"] as const;

/** Even scroll-progress ranges for each word above, shared by the 3D
 * particle-morph scene and the DOM caption overlay so both read from the
 * same single source of truth instead of duplicating the timing math. */
export const typographyWordRanges = typographyWords.map((word, index) => ({
  word,
  start: index / typographyWords.length,
  end: (index + 1) / typographyWords.length,
}));

/**
 * Chapter 04 — Neural Network. Five primary concept nodes (verbatim from the
 * brief) form the core of the graph; the real technology ecosystem
 * (src/data/technology.ts) supplies the secondary, smaller labelled nodes so
 * the network visualises actual capabilities, not filler.
 */
export const primaryConceptNodes: ConceptNode[] = [
  { id: "think", label: "THINK", position: [0, 0.9, 0] },
  { id: "learn", label: "LEARN", position: [1.5, -0.2, 0.6] },
  { id: "understand", label: "UNDERSTAND", position: [-1.6, -0.1, 0.9] },
  { id: "predict", label: "PREDICT", position: [0.9, -0.9, -0.8] },
  { id: "create", label: "CREATE", position: [-0.9, 0.4, -1.1] },
];

export const secondaryConceptNodes: ConceptNode[] = techNodes.map((node, index) => {
  const angle = (index / techNodes.length) * Math.PI * 2;
  const radius = 2.6;
  return {
    id: node.id,
    label: node.label,
    position: [
      Math.cos(angle) * radius,
      Math.sin(angle * 1.7) * 0.9,
      Math.sin(angle) * radius,
    ],
  };
});

/**
 * Chapter 05 — Data Universe. Real, modest proof points
 * (src/data/pillars.ts, sourced from the existing company copy) rendered as
 * particle-formed short tokens rather than invented statistics.
 */
export const universeStats: UniverseStat[] = brandPillars.map((pillar) => ({
  token: pillar.value,
  label: pillar.label,
  description: pillar.description,
}));

/** Even scroll-progress ranges for each statistic above, shared by the 3D
 * particle-formation scene and the DOM caption overlay. */
export const universeStatRanges = universeStats.map((stat, index) => ({
  stat,
  start: index / universeStats.length,
  end: (index + 1) / universeStats.length,
}));

/**
 * Chapter 06 — AI Product Experience. The three real service pillars,
 * reframed as floating product panels (src/data/services.ts is the source
 * of truth; no capabilities are invented here).
 */
export const productPanels: ProductPanel[] = services.map((service) => ({
  slug: service.slug,
  eyebrow: service.icon.toUpperCase(),
  title: service.title,
  summary: service.summary,
  bullets: service.bullets,
}));

/**
 * Chapter 07 — "TRAIN YOUR AI" mini-game. Item vocabulary is exactly the
 * brief's specified game concept (DATA/KNOWLEDGE/EXPERIENCE to collect,
 * NOISE/ERROR/BIAS to avoid) — this is deliberately game mechanics, not a
 * company fact, so it does not need /docs sourcing.
 */
export const gameItemDefinitions: GameItemDefinition[] = [
  { kind: "data", label: "DATA", polarity: "positive" },
  { kind: "knowledge", label: "KNOWLEDGE", polarity: "positive" },
  { kind: "experience", label: "EXPERIENCE", polarity: "positive" },
  { kind: "noise", label: "NOISE", polarity: "negative" },
  { kind: "error", label: "ERROR", polarity: "negative" },
  { kind: "bias", label: "BIAS", polarity: "negative" },
];

/**
 * Chapter 07 — "THE AI PLAYGROUND". Four cohesive interactive experiences —
 * the existing "Train Your AI" catcher plus three new 3D mini-games — framed
 * as one continuous playground rather than unrelated games. Deliberately
 * game mechanics/vocabulary, not company facts, so no /docs sourcing is
 * needed; each `accentHex` also drives that game's own hologram glow and the
 * shared ambience particle field behind the whole chapter (see
 * three/scenes/GameAmbienceScene.tsx + lib/motion/playgroundState.ts).
 */
export const playgroundGames: PlaygroundGameDefinition[] = [
  {
    id: "train",
    index: 1,
    title: "Train Your AI",
    tagline: "Catch signal, dodge noise.",
    description:
      "Steer a live AI agent through a falling data stream — collect DATA, KNOWLEDGE, and EXPERIENCE, and dodge NOISE, ERROR, and BIAS before the clock runs out.",
    accentHex: "#f14a30",
  },
  {
    id: "signal-hunt",
    index: 2,
    title: "AI Signal Hunt",
    tagline: "Find the true signal in the noise.",
    description:
      "A field of transmissions just came online. Tag every genuine AI signal racing toward the core and leave the noise/error transmissions untouched.",
    accentHex: "#22d3ee",
  },
  {
    id: "neural-path",
    index: 3,
    title: "Neural Path",
    tagline: "Route the network to full activation.",
    description:
      "Choose the strongest connection at every junction of a live neural network and build one unbroken, intelligent path from input to decision.",
    accentHex: "#a78bfa",
  },
  {
    id: "data-sort",
    index: 4,
    title: "Data Sort",
    tagline: "Classify the data universe.",
    description:
      "Objects drift through the pipeline. Route DATA, KNOWLEDGE, and SIGNAL into Process, and reject NOISE and ERROR into Discard.",
    accentHex: "#fbbf24",
  },
];

/**
 * Chapter 08 — Cinematic AI Future. The three delivery capabilities
 * (src/data/capabilities.ts) reframed as forward-looking vision pillars —
 * same real facts, future-facing narration.
 */
export const visionPillars: VisionPillar[] = capabilities.map((capability) => ({
  title: capability.title,
  description: capability.summary,
}));
