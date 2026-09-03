import type { ReactNode } from "react";

interface SectionProps {
  id: string;
  ariaLabelledBy?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Shared section shell. `data-scene-section` marks this element as one of
 * the ordered "chapters" the 3D scroll timeline reads from
 * (`ScrollChoreographer` queries these in document order — see
 * lib/motion/scrollTimeline.ts) — every homepage section must use this
 * wrapper (or replicate the attribute) to stay part of the story.
 */
export function Section({ id, ariaLabelledBy, className = "", children }: SectionProps) {
  return (
    <section
      id={id}
      data-scene-section
      aria-labelledby={ariaLabelledBy}
      className={`relative z-10 py-24 sm:py-32 ${className}`.trim()}
    >
      {children}
    </section>
  );
}
