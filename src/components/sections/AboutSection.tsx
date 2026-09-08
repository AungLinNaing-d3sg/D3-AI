"use client";

import { useCallback, useRef } from "react";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { useJourneyFrame } from "@/hooks/useJourneyFrame";
import type { JourneyState } from "@/lib/motion/journeyState";
import { aboutTeamRanges, aboutPartnerNote } from "@/data/journey";
import { services } from "@/data/services";
import { siteConfig } from "@/data/site";

/**
 * Chapter 02 — About Us / Who we are. The real visual is the faceted
 * "identity emblem" and orbiting leadership team in the shared 3D canvas
 * (three/scenes/AboutScene.tsx); this layer supplies the actual "Who we are"
 * narrative (siteConfig.description + the one remaining sourced sentence
 * from /docs/AboutUs.png, `aboutPartnerNote`) and a fully accessible,
 * always-visible team roster (src/data/team.ts) — the active card is kept in
 * sync with whichever orbiting node the 3D scene is currently highlighting,
 * same pattern as the Data Universe chapter's stat cards.
 */
export function AboutSection() {
  const cardRefs = useRef<Array<HTMLLIElement | null>>([]);

  const onFrame = useCallback((state: JourneyState) => {
    const local = state.progress.about;
    aboutTeamRanges.forEach((range, index) => {
      const card = cardRefs.current[index];
      if (!card) return;
      const isActive = local >= range.start && local < range.end;
      card.dataset.active = isActive ? "true" : "false";
    });
  }, []);

  useJourneyFrame(onFrame);

  return (
    <Section stageId="about" ariaLabelledBy="about-heading" className="min-h-[240vh]">
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center gap-10 py-24 sm:py-28">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            headingId="about-heading"
            eyebrow="02 — Who we are"
            title="Who we are"
            description={siteConfig.description}
          />

          <Reveal as="p" delay={0.12} className="max-w-2xl text-balance text-sm leading-relaxed text-ink-300 sm:text-base">
            {aboutPartnerNote}
          </Reveal>

          <Reveal as="div" delay={0.16} className="flex flex-wrap gap-3">
            {services.map((service) => (
              <span
                key={service.slug}
                className="rounded-full border border-brand-400/40 bg-brand-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-300"
              >
                {service.icon.toUpperCase()}
              </span>
            ))}
          </Reveal>
        </Container>
      </div>

      {/* Always-visible, non-decorative team roster — see
          three/scenes/AboutScene.tsx for why the orbiting 3D nodes can't
          carry the full bios directly. */}
      <Container className="relative z-10 flex flex-col gap-8 pb-24">
        <h3 className="font-display text-2xl font-semibold text-ink-50 sm:text-3xl">Meet the team</h3>
        <ul className="grid gap-6 sm:grid-cols-2">
          {aboutTeamRanges.map(({ member }, index) => (
            <li
              key={member.name}
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
              data-active="false"
              className="group rounded-3xl border border-white/10 bg-white/[0.03] p-7 transition-colors duration-300 data-[active=true]:border-brand-400/50 data-[active=true]:bg-brand-500/10"
            >
              <p className="font-display text-lg font-semibold text-ink-50">{member.name}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">{member.role}</p>
              <ul className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
                {member.bio.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-xs leading-relaxed text-ink-300">
                    <span className="mt-1 h-1 w-1 flex-none rounded-full bg-brand-400" aria-hidden="true" />
                    {line}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
