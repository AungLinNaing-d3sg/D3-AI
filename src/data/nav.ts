import type { NavItem } from "@/types";

/**
 * The homepage is a single continuous scrollytelling journey, so navigation
 * jumps to in-page chapters rather than separate routes. `href`s here must
 * match a `data-stage`/`id` rendered by a chapter in `src/app/page.tsx` (see
 * `src/types/index.ts` `STAGE_IDS`).
 */
export const primaryNav: NavItem[] = [
  { href: "#typography", label: "Our Approach" },
  { href: "#neural", label: "How We Think" },
  { href: "#universe", label: "By the Numbers" },
  { href: "#product", label: "Product" },
  { href: "#future", label: "Vision" },
  { href: "#cta", label: "Contact" },
];

/** The footer repeats the same chapter links; "Contact" is already the last
 * primary nav entry (#cta), so there is nothing to append here. */
export const footerNav: NavItem[] = [...primaryNav];
