"use client";

import { useCallback, useRef } from "react";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useJourneyFrame } from "@/hooks/useJourneyFrame";
import type { JourneyState } from "@/lib/motion/journeyState";
import { universeStatRanges } from "@/data/journey";

/**
 * Chapter 05 — Data Universe. The camera travels through a large particle
 * field in the shared 3D canvas (three/scenes/UniverseScene.tsx) that
 * periodically gathers into these same, real proof points
 * (src/data/pillars.ts). The cards below are always fully visible/
 * accessible; the active one is simply highlighted in sync with whichever
 * statistic the particle field is currently forming.
 */
export function UniverseSection() {
  const cardRefs = useRef<Array<HTMLLIElement | null>>([]);

  const onFrame = useCallback((state: JourneyState) => {
    const local = state.progress.universe;
    universeStatRanges.forEach((range, index) => {
      const card = cardRefs.current[index];
      if (!card) return;
      const isActive = local >= range.start && local < range.end;
      card.dataset.active = isActive ? "true" : "false";
    });
  }, []);

  useJourneyFrame(onFrame);

  return (
    <Section stageId="universe" ariaLabelledBy="universe-heading" className="min-h-[300vh]">
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center gap-12 py-24 sm:py-28">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            headingId="universe-heading"
            eyebrow="05 — By the numbers"
            title="A universe built from real data"
            description="Thousands of data points, briefly gathering into the facts that actually describe D3-SG."
          />

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {universeStatRanges.map(({ stat }, index) => (
              <li
                key={stat.label}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                data-active="false"
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors duration-300 data-[active=true]:border-brand-400/50 data-[active=true]:bg-brand-500/10"
              >
                <p className="font-display text-3xl font-semibold text-ink-50">{stat.token}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
                  {stat.label}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-300">{stat.description}</p>
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </Section>
  );
}
