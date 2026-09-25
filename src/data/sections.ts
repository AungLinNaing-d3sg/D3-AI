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
  cta: "Let's Talk",
};

/**
 * The site's real 8 chapters, in real document order — single source of
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
