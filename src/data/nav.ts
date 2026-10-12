import type { NavItem } from "@/types";

/**
 * The homepage is a single continuous scrollytelling journey, so navigation
 * jumps to in-page chapters rather than separate routes. `href`s here must
 * match an `id` rendered by a chapter (see `SECTION_ANCHORS`) in `src/app/page.tsx` (see
 * `src/types/index.ts` `STAGE_IDS`).
 */
export const primaryNav: NavItem[] = [
  { href: "#about", label: "About Us" },
  { href: "#approach", label: "Our Approach" },
  { href: "#how-we-think", label: "How We Think" },
  { href: "#numbers", label: "By the Numbers" },
  { href: "#vision", label: "Vision" },
  { href: "#contact", label: "Contact" },
];

/** The footer repeats the same chapter links; "Contact" is already the last
 * primary nav entry (#contact), so there is nothing to append here. */
export const footerNav: NavItem[] = [...primaryNav];
