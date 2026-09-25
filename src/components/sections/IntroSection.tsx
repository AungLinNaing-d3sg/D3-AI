"use client";

import { useCallback, useRef } from "react";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/motion/Reveal";
import { HeroGreeting } from "@/components/motion/HeroGreeting";
import { useJourneyFrame } from "@/hooks/useJourneyFrame";
import type { JourneyState } from "@/lib/motion/journeyState";
import { siteConfig } from "@/data/site";
import { heroPipelineNodes } from "@/data/journey";

/**
 * Chapter 01 — Cinematic AI Intro. Full-screen hero: large typography over
 * the shared 3D starfield/pipeline atmosphere (see
 * three/scenes/IntroScene.tsx — the THINK/LEARN/UNDERSTAND/PREDICT/CREATE
 * pipeline lives exclusively here, assembling around a central AI core on a
 * real-time clock rather than scroll progress, since it's the first thing a
 * visitor sees), with a slow scroll-driven fade/drift as the user starts the
 * journey — the connective tissue into chapter 02 rather than a hard cut.
 * Visual hierarchy is deliberate: title, then description, then the scroll
 * cue, with the pipeline itself as background atmosphere rather than
 * competing content — see the always-visible, accessible pipeline chip list
 * below the description for non-visual/reduced-motion users.
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
    <Section
      stageId="intro"
      ariaLabelledBy="intro-heading"
      className="min-h-[75vh] md:min-h-[100vh] lg:min-h-[110vh]"
    >
      {/* Pinned/scrubbed only from tablet up (`md:sticky`) — on mobile this
          flows normally with the page so scrolling never feels like a
          full-screen hold, per the "mobile scroll experience" requirement;
          the decorative 3D scene (fixed, full-viewport — see SceneCanvas)
          keeps animating behind it either way. */}
      <div className="relative flex h-auto items-center py-14 md:sticky md:top-0 md:min-h-[100svh] md:py-0">
        {/* Readability scrim: a soft dark pool anchored under the copy column
            (left-of-centre, matching `max-w-3xl` below) so the neural mesh
            behind never fights the title/description for contrast — see
            `.readability-scrim` in globals.css. Sits behind the text (first
            in this stacking context) but above the fixed 3D canvas. */}
        <div
          aria-hidden="true"
          className="readability-scrim pointer-events-none absolute -inset-x-16 -inset-y-24 -z-10 blur-2xl"
        />
        <Container>
          <div ref={contentRef} className="flex max-w-4xl flex-col gap-6">
            <Reveal as="p" className="type-eyebrow text-brand-300">
              {siteConfig.name} · Singapore
            </Reveal>

            {/* Words assemble from converging "data" particles rather than a
                per-character stagger, then catch a one-shot light sweep —
                see components/motion/HeroGreeting.tsx. The title is the
                visual focal point, so it establishes first and gets the
                most deliberate treatment of anything on the page. */}
            <HeroGreeting id="intro-heading" text={siteConfig.tagline} className="type-hero-greeting text-ink-50" />

            {/* Masked "curtain" reveal (see Reveal.tsx `variant="mask"`),
                timed to begin only once the title's own entrance has
                substantially finished — description follows title, never
                competes with it. */}
            <Reveal as="p" delay={1.9} variant="mask" className="max-w-xl type-body-lead text-ink-300">
              {siteConfig.description}
            </Reveal>

            {/* Always-visible, accessible list of the pipeline stages the 3D
                scene assembles around its central core (see
                three/scenes/IntroScene.tsx) — non-visual/reduced-motion
                users still get the concept even though the floating pipeline
                itself is purely decorative/aria-hidden. */}
            <Reveal as="div" delay={2.15} className="flex flex-wrap gap-2">
              {heroPipelineNodes.map((node, index) => (
                <span
                  key={node.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-400/30 bg-brand-500/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300"
                >
                  <span className="text-brand-400/70">{String(index + 1).padStart(2, "0")}</span>
                  {node.label}
                </span>
              ))}
            </Reveal>
          </div>
        </Container>

        <div
          ref={cueRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center gap-2 text-ink-400 md:bottom-10"
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
