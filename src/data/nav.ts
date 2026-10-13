import type { NavItem } from "@/types";

/**
 * The homepage is a single continuous scrollytelling journey, so navigation
 * jumps to in-page chapters rather than separate routes. Contact is not
 * listed: the header's "Contact Us" button already links to it. `href`s here must
 * match an `id` rendered by a chapter (see `SECTION_ANCHORS`) in `src/app/page.tsx` (see
 * `src/types/index.ts` `STAGE_IDS`).
 */
export const primaryNav: NavItem[] = [
  { href: "#about", label: "About Us" },
  { href: "#approach", label: "Our Approach" },
  { href: "#how-we-build", label: "How We Build" },
  { href: "#numbers", label: "By the Numbers" },
  { href: "#vision", label: "Vision" },
  { href: "#faq", label: "FAQ" },
];
