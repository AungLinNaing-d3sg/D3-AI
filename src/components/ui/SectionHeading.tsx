import type { ReactNode } from "react";
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
}

/** Consistent eyebrow/title/description heading block, with a built-in
 * scroll-triggered entrance (see `<Reveal>`). */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className = "",
  headingId,
}: SectionHeadingProps) {
  const alignment = align === "center" ? "items-center text-center mx-auto" : "items-start text-left";

  return (
    <div className={`flex max-w-3xl flex-col gap-4 ${alignment} ${className}`.trim()}>
      <Reveal as="p" className="type-eyebrow text-brand-400">
        {eyebrow}
      </Reveal>
      <Reveal
        as="h2"
        delay={0.05}
        id={headingId}
        variant="words"
        className="type-display-section text-ink-50"
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
