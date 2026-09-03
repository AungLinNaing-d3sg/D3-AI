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
      <Reveal as="p" className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-400">
        {eyebrow}
      </Reveal>
      <Reveal
        as="h2"
        delay={0.05}
        id={headingId}
        className="text-balance font-display text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl lg:text-5xl"
      >
        {title}
      </Reveal>
      {description ? (
        <Reveal as="p" delay={0.1} className="text-balance text-base leading-relaxed text-ink-300 sm:text-lg">
          {description}
        </Reveal>
      ) : null}
    </div>
  );
}
