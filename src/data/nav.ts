import type { NavItem } from "@/types";

/**
 * The homepage is a single scroll-driven experience, so navigation jumps to
 * in-page sections rather than separate routes. `id`s here must match the
 * `id` rendered by each `<Section>` in `src/app/page.tsx`.
 */
export const primaryNav: NavItem[] = [
  { href: "#about", label: "About" },
  { href: "#services", label: "Services" },
  { href: "#solutions", label: "Solutions" },
  { href: "#projects", label: "Projects" },
  { href: "#technology", label: "Technology" },
  { href: "#company", label: "Company" },
];

export const footerNav: NavItem[] = [
  ...primaryNav,
  { href: "#contact", label: "Contact" },
];
