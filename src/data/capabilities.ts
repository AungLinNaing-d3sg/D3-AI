import type { Capability } from "@/types";

/**
 * "Solutions / Capabilities" content. This intentionally does not introduce
 * new business facts — it re-narrates the three real service pillars
 * (see src/data/services.ts, sourced from /docs/OurServices.png) from a
 * "how we work" angle instead of a "what we sell" list, so the section adds
 * value without inventing anything.
 */
export const capabilities: Capability[] = [
  {
    slug: "data-enablement",
    title: "Data & AI enablement",
    summary:
      "A governance-first approach to data, so analytics, machine learning and AI are built on a foundation your organisation can trust.",
    points: [
      "Architecture & governance before scale",
      "Warehousing, virtualisation and insight delivery",
      "AI/ML capabilities delivered as a service",
    ],
  },
  {
    slug: "business-applications",
    title: "Business applications on Microsoft",
    summary:
      "Readiness-led Dynamics 365 and Power Platform delivery, from first assessment through to managed operation.",
    points: [
      "Fit-gap analysis and strategy road-mapping",
      "End-to-end implementation & consultancy",
      "Integration, migration and post-go-live support",
    ],
  },
  {
    slug: "digital-engineering",
    title: "Digital engineering",
    summary:
      "Cloud-native applications and platforms engineered for scale, modernisation, and long-term maintainability.",
    points: [
      "Cloud-native development & modernisation",
      "Information architecture & business process design",
      "Test automation & DevOps built in from the start",
    ],
  },
];
