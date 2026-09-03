import type { TechNode } from "@/types";

/**
 * Technology ecosystem nodes rendered as a connected graph in both the 3D
 * scene and the accessible fallback list. Every label is drawn directly
 * from the existing service portfolio copy ("Revolving around Microsoft
 * Technologies" — see /docs/OurServices.png) rather than invented.
 */
export const techNodes: TechNode[] = [
  { id: "azure", label: "Microsoft Azure", category: "Platform" },
  { id: "dynamics365", label: "Dynamics 365", category: "Applications" },
  { id: "power-platform", label: "Power Platform", category: "Applications" },
  { id: "data-ai", label: "Data, ML & AI", category: "Data & AI" },
  { id: "power-bi", label: "BI & Data Warehousing", category: "Data & AI" },
  { id: "cloud-native", label: "Cloud-Native Apps", category: "Platform" },
  { id: "devops", label: "Test Automation & DevOps", category: "Delivery" },
  { id: "governance", label: "Data Governance", category: "Delivery" },
];
