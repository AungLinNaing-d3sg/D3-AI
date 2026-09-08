"use client";

import { useCallback, useRef } from "react";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/motion/Reveal";
import { useJourneyFrame } from "@/hooks/useJourneyFrame";
import type { JourneyState } from "@/lib/motion/journeyState";
import { typographyWordRanges } from "@/data/journey";
import { services } from "@/data/services";
import { siteConfig } from "@/data/site";

const wordDescriptions: Record<string, string> = {
  "D3-SG": siteConfig.description,
  DATA: services[0]?.summary ?? "",
  DYNAMICS: services[1]?.summary ?? "",
  DIGITAL: services[2]?.summary ?? "",
  AI: "Data, Dynamics, and Digital — connected by one intelligent core.",
};

/**
 * Chapter 03 — 3D AI Typography. The real visual is the particle-formed
 * word in the shared 3D canvas (three/scenes/TypographyScene.tsx); this
 * layer supplies the chapter label, a live caption for whichever word is
 * currently forming (kept in sync via `journeyState.progress.typography`,
 * the same value the particle morph reads), and a fully accessible, always
 * visible list of every word for non-visual/reduced-motion users.
 */
export function TypographySection() {
  const captionWordRef = useRef<HTMLSpanElement>(null);
  const captionDescRef = useRef<HTMLParagraphElement>(null);

  const onFrame = useCallback((state: JourneyState) => {
    const local = state.progress.typography;
    const active =
      typographyWordRanges.find((range) => local >= range.start && local < range.end) ??
      typographyWordRanges[typographyWordRanges.length - 1];
    if (!active) return;
    if (captionWordRef.current) captionWordRef.current.textContent = active.word;
    if (captionDescRef.current) {
      captionDescRef.current.textContent = wordDescriptions[active.word] ?? "";
    }
  }, []);

  useJourneyFrame(onFrame);

  return (
    <Section stageId="typography" ariaLabelledBy="typography-heading" className="min-h-[440vh]">
      <div className="sticky top-0 flex h-[100svh] flex-col justify-between py-24 sm:py-28">
        <Container>
          <Reveal as="p" className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-400">
            03 — Built from three real disciplines
          </Reveal>
        </Container>

        <Container>
          <div className="max-w-2xl">
            <h2
              id="typography-heading"
              className="font-display text-4xl font-semibold tracking-tight text-ink-50 sm:text-5xl"
            >
              <span ref={captionWordRef}>D3-SG</span>
            </h2>
            <p ref={captionDescRef} className="mt-4 max-w-lg text-balance text-base leading-relaxed text-ink-300">
              {siteConfig.description}
            </p>
          </div>
        </Container>
      </div>

      {/* Always-visible, non-decorative fallback: every word the particle
          formation cycles through, with its real meaning — see
          lib/three/textSampler.ts for why the 3D word itself can't carry
          this text directly. */}
      <Container className="relative z-10 pb-24">
        <h2 className="sr-only">The words that shape D3-SG</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {typographyWordRanges.map(({ word }) => (
            <li
              key={word}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-ink-200"
            >
              <p className="font-display text-lg font-semibold text-ink-50">{word}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-400">{wordDescriptions[word]}</p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
