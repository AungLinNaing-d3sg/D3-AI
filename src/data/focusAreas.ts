import type { FocusArea } from "@/types";

/**
 * "Projects / Portfolio" content.
 *
 * The source material under /docs has no published case studies, client
 * names, or project metrics — so, per the brief's "do not invent important
 * company information" rule, this section deliberately does not fabricate
 * client logos, testimonials, or numbers. Instead it showcases the three
 * real delivery focus areas the company operates in (grounded in
 * src/data/services.ts) as an honest portfolio of what D3-SG delivers.
 */
export const focusAreas: FocusArea[] = [
  {
    slug: "data-platforms",
    title: "Data & AI platforms",
    description:
      "Designing and implementing the data architecture, governance and warehousing that analytics and AI/ML initiatives depend on.",
    outcomes: [
      "Data architecture & design",
      "BI & data warehouse implementation",
      "Data-as-a-Service using AI and ML",
    ],
  },
  {
    slug: "dynamics-transformation",
    title: "Dynamics 365 & Power Platform transformation",
    description:
      "Guiding organisations from readiness assessment through implementation, integration, and managed support.",
    outcomes: [
      "Readiness assessment & fit-gap analysis",
      "Integration, upgrades and migration",
      "Post-implementation managed services",
    ],
  },
  {
    slug: "digital-products",
    title: "Cloud-native digital products",
    description:
      "Building and modernising applications with information architecture, automation, and DevOps as first-class concerns.",
    outcomes: [
      "Cloud-native application development",
      "Mobile apps & content/document management",
      "Test automation & DevOps",
    ],
  },
];
