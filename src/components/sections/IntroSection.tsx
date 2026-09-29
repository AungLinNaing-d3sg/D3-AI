"use client";

import { useCallback, useRef, type CSSProperties } from "react";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { HeroGreeting } from "@/components/motion/HeroGreeting";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import { useJourneyFrame } from "@/hooks/useJourneyFrame";
import { useWebglSupported } from "@/hooks/useWebglSupported";
import type { JourneyState } from "@/lib/motion/journeyState";
import { DISCIPLINE_COLORS, heroFocus } from "@/lib/motion/heroFocus";
import { siteConfig } from "@/data/site";
import { services } from "@/data/services";
import { brandPillars } from "@/data/pillars";

/** Proof points shown in the Hero, in this order (real, from src/data/pillars.ts). */
const PROOF = ["Leadership experience", "Technology focus", "Based in"]
  .map((label) => brandPillars.find((pillar) => pillar.label === label))
  .filter((pillar): pillar is (typeof brandPillars)[number] => Boolean(pillar));

/** "Data — Analytics, Machine Learning & AI" → ["Data", "Analytics, Machine Learning & AI"]. */
function splitService(title: string): [string, string] {
  const [name = title, detail = ""] = title.split(" — ");
  return [name, detail];
}

/** The mark as a still image when the 3D scene isn't running (reduced
 * motion / no WebGL) — the Hero still leads with the brand. */
function HeroStaticMark() {
  const { enableScene } = useDeviceCapability();
  const webglSupported = useWebglSupported();
  if (enableScene && webglSupported) return null;
  return (
    <div aria-hidden="true" className="hero-static-mark pointer-events-none">
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative, already-optimised PNG */}
      <img src="/D3SG-logo.png" alt="" width={180} height={56} />
    </div>
  );
}

/**
 * Chapter 01 — the Hero. The living D3-SG mark (three/scenes/IntroScene.tsx:
 * the logo built from glowing particles, orbited by the three disciplines)
 * sits right of the copy on landscape screens and above it on portrait ones;
 * the copy leads with the tagline (assembled from particles — see
 * HeroGreeting), the company description, the three disciplines — hovering
 * or focusing one lights its orbit in the scene (`heroFocus`) — two clear
 * next steps, and a strip of real proof points. Everything after the title
 * enters in sequence once the title has established itself.
 *
 * On scroll the copy fades and drifts in lockstep with the scene's own
 * crossfade weight (see IntroSection.textSync.test.tsx).
 */
export function IntroSection() {
  const contentRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);

  const onFrame = useCallback((state: JourneyState) => {
    const local = state.progress.intro;
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

  const focus = (index: number) => () => {
    heroFocus.discipline = index;
  };
  const blur = () => {
    heroFocus.discipline = -1;
  };

  return (
    <Section
      stageId="intro"
      ariaLabelledBy="intro-heading"
      className="min-h-[75vh] md:min-h-[100vh] lg:min-h-[110vh]"
    >
      {/* Pinned/scrubbed only from tablet up (`md:sticky`) — on mobile this
          flows normally with the page. */}
      <div className="hero-stage relative flex h-auto items-center py-14 md:sticky md:top-0 md:min-h-[100svh] md:py-0">
        <div
          aria-hidden="true"
          className="readability-scrim pointer-events-none absolute -inset-x-16 -inset-y-24 -z-10 blur-2xl"
        />
        <HeroStaticMark />
        <Container>
          <div ref={contentRef} className="hero-copy flex max-w-[40rem] flex-col gap-6">
            <Reveal as="p" className="type-eyebrow flex items-center gap-3 text-brand-300">
              <span className="hero-live-dot" aria-hidden="true" />
              {siteConfig.name} · Singapore
            </Reveal>

            <HeroGreeting id="intro-heading" text={siteConfig.tagline} className="type-hero-greeting text-ink-50" />

            <Reveal as="p" delay={1.9} variant="mask" className="max-w-xl type-body-lead text-ink-300">
              {siteConfig.description}
            </Reveal>

            {/* The three disciplines — each lights its orbit around the mark. */}
            <Reveal as="div" delay={2.1} className="hero-disciplines">
              <ul aria-label="Our three disciplines" className="flex flex-wrap gap-2" onMouseLeave={blur}>
                {services.map((service, index) => {
                  const [name, detail] = splitService(service.title);
                  return (
                    <li key={service.slug}>
                      <a
                        href="#typography"
                        className="hero-discipline"
                        style={{ "--discipline": DISCIPLINE_COLORS[index] } as CSSProperties}
                        onMouseEnter={focus(index)}
                        onFocus={focus(index)}
                        onBlur={blur}
                        aria-label={`${name}: ${detail}`}
                      >
                        <span className="hero-discipline-dot" aria-hidden="true" />
                        <span className="hero-discipline-name">{name}</span>
                        <span className="hero-discipline-detail">{detail}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </Reveal>

            <Reveal as="div" delay={2.25} className="flex flex-wrap items-center gap-3 pt-1">
              <LinkButton href="#cta" variant="primary">
                Start a project
              </LinkButton>
              <LinkButton href="#about" variant="secondary" className="group/explore">
                Explore the journey
                <span aria-hidden="true" className="transition-transform duration-300 group-hover/explore:translate-x-0.5">
                  →
                </span>
              </LinkButton>
            </Reveal>

            <Reveal as="div" delay={2.4}>
              <dl className="hero-proof">
                {PROOF.map((pillar) => (
                  <div key={pillar.label} className="hero-proof-item">
                    <dt className="type-eyebrow text-[0.62rem] text-ink-400">{pillar.label}</dt>
                    <dd className="font-display text-lg font-semibold text-ink-50">{pillar.value}</dd>
                  </div>
                ))}
              </dl>
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
