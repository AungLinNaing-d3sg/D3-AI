import type { ReactNode } from "react";
import type { StageId } from "@/types";

interface SectionProps {
  stageId: StageId;
  ariaLabelledBy?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Shared chapter shell. `data-stage` marks this element as one of the 8
 * ordered chapters the scroll-journey timeline reads from
 * (`ScrollChoreographer` queries these in document order — see
 * lib/motion/scrollTimeline.ts) — every homepage chapter must use this
 * wrapper (or replicate the attribute/id pair) to stay part of the story.
 * `id` is always set to `stageId` so in-page nav anchors (src/data/nav.ts)
 * and this element line up automatically.
 */
export function Section({ stageId, ariaLabelledBy, className = "", children }: SectionProps) {
  return (
    <section
      id={stageId}
      data-stage={stageId}
      aria-labelledby={ariaLabelledBy}
      className={`relative z-10 ${className}`.trim()}
    >
      {children}
    </section>
  );
}
