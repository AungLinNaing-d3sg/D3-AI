import type { ConceptNode, GameItemDefinition, ProductPanel, UniverseStat, VisionPillar } from "@/types";
import { services } from "@/data/services";
import { capabilities } from "@/data/capabilities";
import { brandPillars } from "@/data/pillars";
import { techNodes } from "@/data/technology";

/**
 * Chapter 02 — 3D AI Typography. The word sequence particles form/explode/
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
 * Chapter 03 — Neural Network. Five primary concept nodes (verbatim from the
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
 * Chapter 04 — Data Universe. Real, modest proof points
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
 * Chapter 05 — AI Product Experience. The three real service pillars,
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
 * Chapter 06 — "TRAIN YOUR AI" mini-game. Item vocabulary is exactly the
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
 * Chapter 07 — Cinematic AI Future. The three delivery capabilities
 * (src/data/capabilities.ts) reframed as forward-looking vision pillars —
 * same real facts, future-facing narration.
 */
export const visionPillars: VisionPillar[] = capabilities.map((capability) => ({
  title: capability.title,
  description: capability.summary,
}));
