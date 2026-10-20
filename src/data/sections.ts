import { STAGE_IDS, type StageId } from "@/types";

export interface SiteSectionSummary {
  id: StageId;
  /** 1-based display order — matches `STAGE_IDS` order, which is both
   * document order and camera/timeline order (see `src/app/page.tsx`). */
  index: number;
  shortLabel: string;
}

/** Condensed rail labels drawn from each chapter's own real eyebrow/title
 * (see the section components themselves) — not invented section names. */
const SHORT_LABELS: Record<StageId, string> = {
  intro: "Hero",
  about: "Who We Are",
  typography: "Our Approach",
  neural: "How We Build",
  universe: "By The Numbers",
  game: "AI Playground",
  future: "Vision",
  faq: "FAQ",
  cta: "Let's Talk",
};

/**
 * The site's real chapters, in real document order — single source of
 * truth for the global scroll-progress rail
 * (`components/layout/ScrollProgressRail.tsx`). Deliberately separate from
 * the AI Playground's own internal chapter list
 * (`src/data/journey.ts` `playgroundExperiences`) — that one is scoped to
 * chapter 06's own 4 sub-experiences; this one is the whole site.
 */
export const siteSections: SiteSectionSummary[] = STAGE_IDS.map((id, index) => ({
  id,
  index: index + 1,
  shortLabel: SHORT_LABELS[id],
}));

/** The label each chapter's section header shows next to its number (see
 * components/ui/SectionHeading.tsx), matching the main menu's wording. */
const HEADER_LABELS: Record<StageId, string> = {
  intro: "Home",
  about: "About Us",
  typography: "Our Approach",
  neural: "How We Build",
  universe: "By the Numbers",
  game: "AI Playground",
  future: "Our Vision",
  faq: "FAQ",
  cta: "Let’s Talk",
};

/** A chapter's section-header number ("04") and label ("How We Build"),
 * numbered from the real chapter order so it can never drift. */
export function sectionHeader(id: StageId): { number: string; label: string } {
  return {
    number: String(STAGE_IDS.indexOf(id) + 1).padStart(2, "0"),
    label: HEADER_LABELS[id],
  };
}
