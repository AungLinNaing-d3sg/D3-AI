import { smoothstep } from "@/lib/motion/mathUtils";

/**
 * Chapter 08's scroll story — a system activation in four phases:
 * ENTER → CONNECT → INTELLIGENCE → COMPLETE — as one shared, scroll-owned
 * value.
 *
 * `progress` is written by a single `ScrollTrigger` on the section (see
 * components/sections/CtaStage.tsx `useCtaStory`): 0 when the section's top
 * edge enters the bottom of the viewport, 1 when its bottom edge reaches the
 * bottom of the viewport. The 3D intelligence core
 * (three/scenes/CtaScene.tsx) reads it every frame, and the HTML reads the
 * same value as the `--cta-progress` custom property and the
 * `data-cta-phase` attribute, so the scene and the content always tell the
 * same beat of the story. It is scroll position, not a timer: scrolling back
 * reverses everything.
 */
export const ctaStory = {
  progress: 0,
};

export type CtaPhase = "enter" | "connect" | "intelligence" | "complete";

/** The phase a given progress falls in — for the HTML's status readout. */
export function ctaPhaseAt(progress: number): CtaPhase {
  if (progress < 0.24) return "enter";
  if (progress < 0.52) return "connect";
  if (progress < 0.8) return "intelligence";
  return "complete";
}

/** 0..100 — how synchronised the system is, for the HTML readout. */
export function ctaSyncAt(progress: number): number {
  return Math.round(smoothstep(0.1, 0.86, progress) * 100);
}

export interface CtaStoryPhases {
  /** ENTER: the environment comes up and the core emerges from depth. */
  wake: number;
  /** CONNECT: scattered data points move in toward the core and its paths. */
  converge: number;
  /** CONNECT: data paths illuminate one after another; rings start turning. */
  connect: number;
  /** INTELLIGENCE: the internal plates and rings lock into alignment. */
  organize: number;
  /** INTELLIGENCE: orange energy concentrates in the nucleus; the view
   * closes in; reflections strengthen. */
  energy: number;
  /** COMPLETE: movement calms, the core settles into its stable state and
   * steps back so the content and CTA carry the focus. */
  complete: number;
}

/** Splits the story's 0..1 progress into its overlapping phases. */
export function ctaStoryPhases(progress: number, out: CtaStoryPhases): CtaStoryPhases {
  out.wake = smoothstep(0, 0.24, progress);
  out.converge = smoothstep(0.12, 0.6, progress);
  out.connect = smoothstep(0.22, 0.7, progress);
  out.organize = smoothstep(0.45, 0.82, progress);
  out.energy = smoothstep(0.5, 0.84, progress);
  out.complete = smoothstep(0.8, 0.97, progress);
  return out;
}
