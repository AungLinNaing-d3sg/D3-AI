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
