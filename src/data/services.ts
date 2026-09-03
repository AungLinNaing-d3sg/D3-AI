import type { Service } from "@/types";

/**
 * Service portfolio content, carried over from the existing "Our Services"
 * page copy (see /docs/OurServices.png) so the new design doesn't lose any
 * business information.
 */
export const services: Service[] = [
  {
    slug: "data",
    icon: "data",
    title: "Data — Analytics, Machine Learning & AI",
    summary:
      "Turn scattered data into a trusted, governed asset that powers analytics, ML, and AI initiatives.",
    bullets: [
      "Data architecture & design",
      "Data management & governance",
      "BI & data warehouse implementation",
      "Data virtualisation, analytics & insights",
      "Data-as-a-Service using AI and ML",
    ],
  },
  {
    slug: "dynamics",
    icon: "dynamics",
    title: "Dynamics — 365 & Power Platform",
    summary:
      "End-to-end Microsoft Dynamics 365 and Power Platform delivery, from readiness through managed support.",
    bullets: [
      "Readiness assessment & fit-gap analysis",
      "Strategy road-mapping & planning",
      "End-to-end project implementation & consultancy",
      "Integration, upgrades and migration",
      "Post-implementation support & managed services",
    ],
  },
  {
    slug: "digital",
    icon: "digital",
    title: "Digital — Development",
    summary:
      "Modern, cloud-native applications and platforms engineered for scale, security, and maintainability.",
    bullets: [
      "Cloud-native application development",
      "Application modernisation",
      "Mobile apps development",
      "Content & document management systems",
      "Business process management",
      "Information architecture & design",
      "Test automation & DevOps",
      "Office automation",
    ],
  },
];
