import type { CSSProperties, ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { sectionHeader } from "@/data/sections";
import type { StageId } from "@/types";

interface SectionKickerProps {
  label: string;
  /** Two-digit chapter number; omitted for a sub-section kicker (an orange
   * dot shows instead). */
  number?: string;
  className?: string;
}

/**
 * The small header label above a title: a glass pill with the chapter
 * number in an orange badge, a short shimmering orange rule and the label
 * in spaced white capitals. Used by every section header (via
 * `SectionHeading`), and on its own, without a number, for a sub-section.
 */
export function SectionKicker({ label, number, className = "" }: SectionKickerProps) {
  return (
    <Reveal as="p" className={`section-kicker ${className}`.trim()}>
      {number ? <span className="section-kicker-num">{number}</span> : <span aria-hidden="true" className="section-kicker-dot" />}
      <span aria-hidden="true" className="section-kicker-rule" />
      <span className="section-kicker-label">{label}</span>
    </Reveal>
  );
}

type TitleVariant = "lines" | "maskLines";

interface SectionHeadingProps {
  /** The chapter this header belongs to — its number and label come from
   * `sectionHeader` (src/data/sections.ts), so every section is numbered
   * and labelled the same way. */
  stage: StageId;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
  /** Applied to the `<h2>` so a wrapping `<section>` can reference it via
   * `aria-labelledby`. */
  headingId?: string;
  /** Drops a soft `.readability-scrim` pool behind the whole heading block —
   * for chapters whose 3D scene runs bright/busy content directly behind the
   * copy rather than the calmer atmosphere most chapters get. */
  scrim?: boolean;
  /** The title's entrance: lines emerging from depth (default), or each
   * line sliding up out of its own mask. */
  titleVariant?: TitleVariant;
}

/** The one section header used by every chapter: numbered kicker, title
 * (white with an orange accent phrase) and optional lead copy, with a
 * built-in scroll-triggered entrance (see `<Reveal>`) and a soft glow on
 * the title. */
export function SectionHeading({
  stage,
  title,
  description,
  align = "left",
  className = "",
  headingId,
  scrim = false,
  titleVariant = "lines",
}: SectionHeadingProps) {
  const alignment = align === "center" ? "items-center text-center mx-auto" : "items-start text-left";
  const { number, label } = sectionHeader(stage);

  return (
    <div className={`section-header relative flex max-w-3xl flex-col ${alignment} ${className}`.trim()}>
      {scrim ? (
        <div
          aria-hidden="true"
          className="readability-scrim pointer-events-none absolute -inset-x-10 -inset-y-12 -z-10 blur-2xl"
          style={{ "--scrim-strength": 0.6 } as CSSProperties}
        />
      ) : null}
      <SectionKicker number={number} label={label} />
      <Reveal
        as="h2"
        delay={0.05}
        id={headingId}
        variant={titleVariant}
        className="section-header-title section-heading-glow type-display-section text-ink-50"
      >
        {title}
      </Reveal>
      {description ? (
        <Reveal as="p" delay={0.18} variant="depth" className="section-header-lead type-body-lead text-ink-300">
          {description}
        </Reveal>
      ) : null}
    </div>
  );
}
