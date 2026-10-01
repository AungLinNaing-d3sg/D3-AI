"use client";

import { useCallback, useRef, type CSSProperties } from "react";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { useJourneyFrame } from "@/hooks/useJourneyFrame";
import type { JourneyState } from "@/lib/motion/journeyState";
import { universeStatRanges, universeStations } from "@/data/journey";

/** Plain-language description of the shared 3D backdrop (see
 * three/scenes/UniverseScene.tsx — a single live coding-terminal scene, not a
 * per-statistic visual, so every card shares this same caption) — read
 * alongside the real statistic so non-visual/reduced-motion users still know
 * what the decorative canvas is depicting, without duplicating the
 * statistic text itself. */
const UNIVERSE_VISUAL_CAPTION =
  "3D scene: a live coding terminal, typing out this statistic alongside the company's other real proof points.";

/**
 * Chapter 05 — Data Universe ("By the numbers"). A single, persistent 3D
 * "coding terminal" scene sits behind this chapter (see
 * three/scenes/UniverseScene.tsx) rather than a distinct composition per
 * statistic. This HTML layer is the primary information source — the cards
 * below are always fully visible/accessible regardless of whether WebGL is
 * available; the active one is simply highlighted in sync with whichever
 * statistic the terminal is currently typing.
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
      className="min-h-[90vh] md:min-h-[110vh] lg:min-h-[125vh]"
    >
      {/* Flows with the page at every size (no pin) — the 4 real statistic
          cards are the primary, always-fully-visible layer (never
          squeezed/clipped inside a fixed-height pin), with
          the smaller, decorative 3D data universe (see UniverseScene.tsx,
          scaled down via objectScale) animating behind them the whole time —
          see the "By the numbers" mobile requirement. A little more runway
          than the single-beat chapters since 4 stations cycle through here
          (see universeStatRanges). */}
      <div className="relative flex h-auto flex-col justify-center gap-8 py-10 md:min-h-[100svh] md:gap-8 md:py-16 lg:gap-10 lg:py-20">
        <Container data-depth-exit className="flex flex-col gap-10">
          <SectionHeading
            headingId="universe-heading"
            eyebrow="05 — By the numbers"
            title="A data universe built from real numbers"
            description="A live coding terminal, typing behind this section — because these numbers are the product of real, ongoing work, not marketing copy."
            scrim
          />

          {/* The active statistic comes forward in depth (scale, Z, full
              opacity) while the others step back a touch — see
              `.depth-stat` in globals.css, keyed off the same `data-active`
              the terminal scene syncs to. */}
          <Reveal as="div" variant="depth" delay={0.1}>
          <ul className="depth-stage depth-stat-list grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {universeStations.map(({ stat }, index) => (
              <li
                key={stat.label}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                data-active="false"
                data-depth-tilt
                style={{ "--halo-color": "#f14a30" } as CSSProperties}
                className="glass-panel data-active-halo depth-tilt depth-stat group relative p-6 pt-8"
              >
                <span aria-hidden="true" className="depth-glare" />
                {/* Token floats outside the card body as its own chip
                    rather than sitting flush inside the box — an
                    asymmetric layout instead of a flat rectangle. Bounded by
                    both `left`/`right` insets (rather than left-only,
                    content-width) so it can never grow past its own card,
                    however long a future token turns out to be. */}
                <span className="depth-stat-token absolute -top-4 left-5 right-5 inline-flex items-center justify-center rounded-2xl border border-brand-400/40 bg-ink-950 px-4 py-1 text-center shadow-[0_10px_30px_-15px_rgba(0,0,0,0.85)]">
                  <span className="type-display-stat text-balance text-brand-300">{stat.token}</span>
                </span>
                <p style={{ "--layer": 4 } as CSSProperties} className="depth-layer type-eyebrow text-brand-300">
                  {stat.label}
                </p>
                <p className="depth-stat-copy mt-3 text-sm leading-relaxed text-ink-300">{stat.description}</p>
                <p className="sr-only">{UNIVERSE_VISUAL_CAPTION}</p>
              </li>
            ))}
          </ul>
          </Reveal>
        </Container>
      </div>
    </Section>
  );
}
