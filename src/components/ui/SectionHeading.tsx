import type { CSSProperties, ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";

interface SectionHeadingProps {
  eyebrow: string;
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
}

/** Consistent eyebrow/title/description heading block, with a built-in
 * scroll-triggered entrance (see `<Reveal>`) and one shared premium accent
 * treatment — a thin, slowly shimmering "data" indicator under the eyebrow
 * plus a soft static glow on the heading itself — applied consistently
 * across every major chapter rather than a bespoke animated effect per
 * section. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className = "",
  headingId,
  scrim = false,
}: SectionHeadingProps) {
  const alignment = align === "center" ? "items-center text-center mx-auto" : "items-start text-left";

  return (
    <div className={`relative flex max-w-3xl flex-col gap-4 ${alignment} ${className}`.trim()}>
      {scrim ? (
        <div
          aria-hidden="true"
          className="readability-scrim pointer-events-none absolute -inset-x-10 -inset-y-12 -z-10 blur-2xl"
          style={{ "--scrim-strength": 0.6 } as CSSProperties}
        />
      ) : null}
      {/* brand-300, not brand-400 — brand-400 reads too low-contrast at this
          weight/size directly on the near-black background. */}
      <Reveal as="p" className="type-eyebrow text-brand-300">
        {eyebrow}
      </Reveal>
      <span aria-hidden="true" className="section-heading-accent" />
      <Reveal
        as="h2"
        delay={0.05}
        id={headingId}
        variant="words"
        className="section-heading-glow type-display-section text-ink-50"
      >
        {title}
      </Reveal>
      {description ? (
        <Reveal as="p" delay={0.1} variant="blur" className="type-body-lead text-ink-300">
          {description}
        </Reveal>
      ) : null}
    </div>
  );
}
