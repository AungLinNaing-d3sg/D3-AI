"use client";

import { useCallback, useRef } from "react";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useJourneyFrame } from "@/hooks/useJourneyFrame";
import type { JourneyState } from "@/lib/motion/journeyState";
import { universeStatRanges, universeStations } from "@/data/journey";
import type { UniverseStationVariant } from "@/types";

/** Short, plain-language description of each station's 3D visual treatment
 * (see `UniverseStationVariant` in src/types/index.ts) — read alongside the
 * real statistic so non-visual/reduced-motion users still know what the
 * decorative canvas is depicting, without duplicating the statistic text
 * itself. */
const stationVisualCaptions: Record<UniverseStationVariant, string> = {
  location: "3D scene: a Singapore-anchored data cluster gathering into shape.",
  timeline: "3D scene: a dimensional timeline receding behind large 3D typography.",
  network: "3D scene: a structured technology network assembling block by block.",
  impact: "3D scene: connected project nodes with particles travelling between them.",
};

/**
 * Chapter 05 — Data Universe ("By the numbers"). The camera dollies through
 * a distinct 3D composition per statistic in the shared canvas (see
 * three/scenes/UniverseScene.tsx) that gathers into these same, real proof
 * points (src/data/pillars.ts). This HTML layer is the primary information
 * source — the cards below are always fully visible/accessible regardless of
 * whether WebGL is available; the active one is simply highlighted in sync
 * with whichever station the 3D scene is currently focused on.
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
    <Section
      stageId="universe"
      ariaLabelledBy="universe-heading"
      className="min-h-[100vh] md:min-h-[120vh] lg:min-h-[140vh]"
    >
      {/* Pinned only from tablet up — on mobile the 4 real statistic cards
          are the primary, always-fully-visible layer and simply flow with
          the page (never squeezed/clipped inside a fixed-height pin), with
          the smaller, decorative 3D data universe (see UniverseScene.tsx,
          scaled down via objectScale) animating behind them the whole time —
          see the "By the numbers" mobile requirement. A little more runway
          than the single-beat chapters since 4 stations cycle through here
          (see universeStatRanges). */}
      <div className="relative flex h-auto flex-col justify-center gap-8 py-12 md:sticky md:top-0 md:h-[100svh] md:gap-10 md:py-24 lg:gap-12 lg:py-28">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            headingId="universe-heading"
            eyebrow="05 — By the numbers"
            title="A data universe built from real numbers"
            description="A cinematic 3D data universe — particles, nodes, and connections — gathering behind this section into the facts that actually describe D3-SG."
          />

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {universeStations.map(({ stat, variant }, index) => (
              <li
                key={stat.label}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                data-active="false"
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-300 data-[active=true]:scale-[1.03] data-[active=true]:border-brand-400/50 data-[active=true]:bg-brand-500/10"
              >
                <p className="type-display-stat text-ink-50">{stat.token}</p>
                <p className="type-eyebrow mt-2 text-brand-400">{stat.label}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-300">{stat.description}</p>
                <p className="sr-only">{stationVisualCaptions[variant]}</p>
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </Section>
  );
}
