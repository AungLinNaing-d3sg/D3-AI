"use client";

import { useCallback, useRef, type CSSProperties } from "react";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { capabilities } from "@/data/capabilities";
import { siteConfig } from "@/data/site";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import { useJourneyFrame } from "@/hooks/useJourneyFrame";
import { useWebglSupported } from "@/hooks/useWebglSupported";

/** The deep-ocean chapter's still fallback when the shared 3D canvas isn't
 * running (reduced motion / no WebGL): the same abyss, surface light and
 * light shafts, as a static gradient (see `.future-static-ocean`). */
function FutureStaticOcean() {
  const { enableScene } = useDeviceCapability();
  const webglSupported = useWebglSupported();
  if (enableScene && webglSupported) return null;
  return <div aria-hidden="true" className="future-static-ocean pointer-events-none absolute inset-0 -z-10" />;
}

/** The three real disciplines each capability belongs to (see the About
 * and Our Approach chapters). */
const DISCIPLINES = ["Data", "Dynamics", "Digital"];

/**
 * Chapter 07 — Our vision, as a three-step roadmap over the deep-ocean
 * world around the D3-SG mark (three/scenes/FutureScene.tsx).
 *
 * Built from the site's own vocabulary — the shared `SectionHeading`, the
 * dark `glass-panel` surface and the orange `data-active-halo` used by "By
 * the numbers" — so it reads as part of the same system. The three real
 * capabilities (src/data/capabilities.ts) are pillars on a thin rail: as
 * the chapter scrolls, each becomes active in turn (its halo lights, its
 * ghost numeral warms, a progress line fills along its base, and its node on
 * the rail glows). Scroll-driven state is written straight to the DOM from
 * the shared timeline — no React render per frame. Under reduced motion the
 * timeline doesn't run and the pillars simply sit, fully legible.
 */
export function FutureSection() {
  const pillarRefs = useRef<Array<HTMLLIElement | null>>([]);
  const nodeRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const lastActive = useRef(-1);

  const onFrame = useCallback(() => {
    // Only while this chapter is showing. The chapter's timeline progress
    // completes while it's still arriving, so the pillars follow the
    // content's own reading window instead: 01 as it comes into view, 03
    // before it leaves.
    const section = pillarRefs.current[0]?.closest("section");
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const viewport = window.innerHeight;
    if (rect.bottom < 0 || rect.top > viewport) return;
    const start = viewport * 0.5;
    const span = viewport * 0.62;
    const progress = (start - rect.top) / span;
    const count = capabilities.length;
    const scaled = Math.min(0.9999, Math.max(0, progress)) * count;
    const active = Math.floor(scaled);
    pillarRefs.current.forEach((pillar, index) => {
      if (!pillar) return;
      const fill = index < active ? 1 : index === active ? scaled - active : 0;
      pillar.style.setProperty("--pillar-fill", fill.toFixed(3));
    });
    if (active === lastActive.current) return;
    lastActive.current = active;
    pillarRefs.current.forEach((pillar, index) => {
      if (pillar) pillar.dataset.active = index === active ? "true" : "false";
    });
    nodeRefs.current.forEach((node, index) => {
      if (node) node.dataset.state = index < active ? "done" : index === active ? "active" : "idle";
    });
  }, []);

  useJourneyFrame(onFrame);

  return (
    <Section
      stageId="future"
      ariaLabelledBy="future-heading"
      className="min-h-[75vh] md:min-h-[90vh] lg:min-h-[105vh]"
    >
      <FutureStaticOcean />
      {/* Pinned only from tablet up — see IntroSection for why mobile flows
          normally instead of holding a full-screen pin. */}
      <div className="relative flex h-auto flex-col justify-center gap-8 py-10 md:sticky md:top-0 md:min-h-[100svh] md:gap-10 md:py-16 lg:py-20">
        <Container className="flex flex-col gap-10 lg:gap-12">
          <SectionHeading
            headingId="future-heading"
            eyebrow="07 — Our vision"
            title={siteConfig.tagline}
            description="Not a distant promise — the same three disciplines you just walked through, carried forward."
            scrim
          />

          <div className="vision-roadmap">
            {/* The rail the three pillars sit on (wide screens). */}
            <div aria-hidden="true" className="vision-rail">
              <span className="vision-rail-line" />
              {capabilities.map((capability, index) => (
                <span
                  key={capability.slug}
                  ref={(node) => {
                    nodeRefs.current[index] = node;
                  }}
                  data-state="idle"
                  className="vision-rail-node"
                  style={{ "--col": index } as CSSProperties}
                />
              ))}
            </div>

            <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {capabilities.map((capability, index) => (
                <li
                  key={capability.slug}
                  ref={(node) => {
                    pillarRefs.current[index] = node;
                  }}
                  data-active="false"
                  aria-labelledby={`vision-${capability.slug}`}
                  style={{ "--halo-color": "#f14a30" } as CSSProperties}
                  className={`vision-pillar glass-panel data-active-halo ${index === 2 ? "sm:col-span-2 lg:col-span-1" : ""}`}
                >
                  <span aria-hidden="true" className="vision-numeral">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Reveal as="div" delay={index * 0.08} className="relative flex h-full flex-col">
                    <p className="flex items-center gap-2 type-eyebrow text-brand-300">
                      <span>Pillar {String(index + 1).padStart(2, "0")}</span>
                      <span aria-hidden="true" className="h-px w-4 bg-brand-400/50" />
                      <span className="text-ink-400">{DISCIPLINES[index]}</span>
                    </p>
                    <h3 id={`vision-${capability.slug}`} className="mt-5 max-w-[calc(100%-4.5rem)] font-display text-xl font-semibold leading-snug text-ink-50">
                      {capability.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink-300">{capability.summary}</p>
                    <ul className="vision-points mt-auto" aria-label={`${capability.title}: focus areas`}>
                      {capability.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </Reveal>
                  <span aria-hidden="true" className="vision-progress" />
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </div>
    </Section>
  );
}
