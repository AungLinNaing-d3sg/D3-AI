/**
 * Chapter 04's delivery process (ported from the light redesign,
 * development_v2). Each step restates the real service scope in
 * src/data/services.ts — nothing new is claimed here.
 */
export const processContent = {
  title: "From first assessment to",
  titleHighlight: "managed operation.",
  lead: "A team with real-world project experience and industrial know-how, with you at every step.",
} as const;

export const processSteps = [
  {
    title: "Assess",
    text: "Readiness assessment and fit-gap analysis, so we know exactly where you are and what is worth changing.",
  },
  {
    title: "Plan",
    text: "Strategy road-mapping and planning, with a data architecture and governance model your organisation can trust.",
  },
  {
    title: "Build",
    text: "End-to-end implementation, integration, upgrades and migration, backed by test automation and DevOps.",
  },
  {
    title: "Run",
    text: "Post-implementation support and managed services that keep your platforms healthy as you grow.",
  },
] as const;
