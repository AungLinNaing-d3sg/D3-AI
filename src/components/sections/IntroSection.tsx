"use client";

import { useCallback, useRef } from "react";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/motion/Reveal";
import { useJourneyFrame } from "@/hooks/useJourneyFrame";
import type { JourneyState } from "@/lib/motion/journeyState";
import { siteConfig } from "@/data/site";

/**
 * Chapter 01 — Cinematic AI Intro. Full-screen hero: large typography over
 * the shared 3D starfield/atmosphere (see three/scenes/IntroScene.tsx),
 * with a slow scroll-driven fade/drift as the user starts the journey —
 * the connective tissue into chapter 02 rather than a hard cut.
 */
export function IntroSection() {
  const contentRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);

  const onFrame = useCallback((state: JourneyState) => {
    const local = state.progress.intro;
    // The hero copy must dissolve in lockstep with the 3D scene's own
    // crossfade weight (three/scenes/IntroScene.tsx reads the same
    // `weight.intro` — see lib/motion/scrollTimeline.ts `crossfadeWeight`)
    // rather than a disconnected local-progress formula, otherwise the text
    // and the starfield/nebula visual fall out of sync and the copy can
    // vanish while the 3D scene is still fully visible (or vice versa).
    const weight = state.weight.intro;
    const content = contentRef.current;
    const cue = cueRef.current;
    if (content) {
      content.style.opacity = String(weight);
      content.style.transform = `translate3d(0, ${local * -48}px, 0)`;
    }
    if (cue) {
      cue.style.opacity = String(Math.max(weight - local * 4, 0));
    }
  }, []);

  useJourneyFrame(onFrame);

  return (
    <Section stageId="intro" ariaLabelledBy="intro-heading" className="min-h-[170vh]">
      <div className="sticky top-0 flex h-[100svh] items-center">
        <Container>
          <div ref={contentRef} className="flex max-w-3xl flex-col gap-6">
            <Reveal as="p" className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-400">
              {siteConfig.name} · Singapore
            </Reveal>

            <Reveal
              as="h1"
              delay={0.05}
              id="intro-heading"
              className="text-balance font-display text-5xl font-semibold leading-[1.02] tracking-tight text-ink-50 sm:text-7xl lg:text-8xl"
            >
              {siteConfig.tagline}
            </Reveal>

            <Reveal
              as="p"
              delay={0.18}
              className="max-w-xl text-balance text-base leading-relaxed text-ink-300 sm:text-lg"
            >
              {siteConfig.description}
            </Reveal>
          </div>
        </Container>

        <div
          ref={cueRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-10 flex flex-col items-center gap-2 text-ink-400"
        >
          <span className="text-[0.65rem] font-medium uppercase tracking-[0.3em]">Scroll to enter the journey</span>
          <span className="h-9 w-5 rounded-full border border-ink-400/60 p-1">
            <span className="block h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400" />
          </span>
        </div>
      </div>
    </Section>
  );
}
