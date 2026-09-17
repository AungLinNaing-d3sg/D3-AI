"use client";

import { useCallback, useRef, type CSSProperties } from "react";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/motion/Reveal";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { useJourneyFrame } from "@/hooks/useJourneyFrame";
import type { JourneyState } from "@/lib/motion/journeyState";
import { disciplineFocus } from "@/lib/motion/disciplineFocus";
import { services } from "@/data/services";

/** One accent per discipline — order matches `services` (Data, Dynamics,
 * Digital). Applied consistently everywhere: active card border/glow/badge,
 * hover state, and (see `DISCIPLINE_ACCENTS` in
 * three/scenes/TypographyScene.tsx, kept in sync with this exact triad) the
 * matching sphere cluster's highlight colour. */
const DISCIPLINE_ACCENTS = ["#00d2ff", "#ff4d2d", "#00e676"] as const;

/**
 * Chapter 03 — "Built from Real Disciplines" — the single source for the
 * three real disciplines (Data, Dynamics, Digital); the "AI Product
 * Experience" chapter that used to repeat this same content further down
 * the page has been removed (see src/app/page.tsx). The real visual is one
 * connected system in the shared 3D canvas (three/scenes/TypographyScene.tsx
 * — a Fibonacci-sphere of glowing nodes split into three discipline
 * clusters joined by a neutral lattice, with a 3D label per discipline, not
 * particle-formed text or a separate wireframe "core"); this layer supplies
 * three real, always-readable glass cards (src/data/services.ts, every
 * bullet preserved in full — not truncated) that both scroll and a direct
 * hover/click can bring forward — via `disciplineFocus`, read by the 3D
 * scene every frame — so the active card, its sphere label, and its
 * cluster's highlight never fall out of sync.
 */
export function TypographySection() {
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const onFrame = useCallback((state: JourneyState) => {
    const local = state.progress.typography;
    const scrollIndex = Math.min(
      services.length - 1,
      Math.max(0, Math.floor(local * services.length)),
    );
    // Hover previews instantly; a click's pin persists until released by
    // scroll (see TypographyScene.tsx); scroll drives it the rest of the
    // time — see disciplineFocus.ts for the full priority rationale.
    const activeIndex =
      disciplineFocus.hovered ?? disciplineFocus.pinned ?? scrollIndex;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      card.dataset.active = index === activeIndex ? "true" : "false";
    });
  }, []);

  useJourneyFrame(onFrame);

  /** Pins a discipline as active — persists (read by the 3D scene's
   * `disciplineFocus.pinned`) until the user scrolls far enough away (see
   * `TypographyScene.tsx`), so click and scroll both stay in control
   * without fighting each other. */
  const selectDiscipline = useCallback((index: number) => {
    disciplineFocus.pinned = index;
  }, []);

  /** Hover/focus preview — immediate, and cleared the instant the pointer
   * leaves (or focus moves away) rather than needing to be "released". */
  const hoverDiscipline = useCallback((index: number) => {
    disciplineFocus.hovered = index;
  }, []);
  const unhoverDiscipline = useCallback((index: number) => {
    if (disciplineFocus.hovered === index) disciplineFocus.hovered = null;
  }, []);

  return (
    <Section
      stageId="typography"
      ariaLabelledBy="typography-heading"
      className="min-h-[85vh] md:min-h-[100vh] lg:min-h-[110vh]"
    >
      {/* Pinned only from tablet up — see IntroSection for why mobile flows
          normally instead of holding a full-screen pin. */}
      <div className="relative flex h-auto flex-col justify-center gap-8 py-10 md:sticky md:top-0 md:min-h-[100svh] md:py-16 lg:py-20">
        <Container className="flex flex-col gap-18">
          <div className="relative max-w-2xl">
            {/* Soft, off-centre readability pool — not a solid rectangle —
                so the sphere's lattice lines never fight this copy for
                contrast (the sphere itself stays fully visible around it). */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-10 -inset-y-10 -z-10 rounded-[3rem] bg-[radial-gradient(65%_75%_at_30%_40%,_rgb(5_7_13/0.78)_0%,_rgb(5_7_13/0.4)_55%,_transparent_78%)] blur-xl"
            />
            <Reveal as="p" className="type-eyebrow text-brand-300">
              03 — Built from real disciplines
            </Reveal>
            <span aria-hidden="true" className="section-heading-accent mt-3" />
            <Reveal
              as="h2"
              delay={0.05}
              id="typography-heading"
              className="section-heading-glow mt-4 type-display-section text-ink-50"
            >
              Three disciplines, one intelligent system
            </Reveal>
            <Reveal
              as="p"
              delay={0.1}
              className="mt-4 type-body-lead text-ink-300"
            >
              Data, Dynamics, and Digital aren&apos;t separate offerings —
              they&apos;re one connected system, visualised behind this section
              as a single sphere of linked nodes. Select a discipline below, or
              keep scrolling, to see how it fits into the whole.
            </Reveal>
          </div>

          {/* Real, always-reachable interaction surface — normal document
              flow, no nested scroll container. Each card carries its own
              full content (not a separate shared caption panel), so the
              active one is always clearly, fully readable on its own. */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
            {services.map((service, index) => {
              const accent =
                DISCIPLINE_ACCENTS[index % DISCIPLINE_ACCENTS.length] ??
                "#ffffff";
              return (
                <Reveal key={service.slug} as="div" delay={0.14 + index * 0.06}>
                  <button
                    type="button"
                    ref={(node) => {
                      cardRefs.current[index] = node;
                    }}
                    data-active="false"
                    onClick={() => selectDiscipline(index)}
                    onMouseEnter={() => hoverDiscipline(index)}
                    onMouseLeave={() => unhoverDiscipline(index)}
                    onFocus={() => hoverDiscipline(index)}
                    onBlur={() => unhoverDiscipline(index)}
                    aria-label={`Focus ${service.title} in the connected system`}
                    style={{ "--accent": accent } as CSSProperties}
                    className="discipline-card group flex h-full w-full flex-col gap-4 p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    {/* Active pill/badge — only shown once this card is the
                        active discipline (hover, click, or scroll). */}
                    <span aria-hidden="true" className="discipline-card-badge">
                      Active
                    </span>

                    <ServiceIcon
                      name={service.icon}
                      className="h-8 w-8"
                      style={{ color: accent }}
                    />
                    <h3 className="font-display text-lg font-semibold text-ink-50">
                      {service.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-ink-300">
                      {service.summary}
                    </p>
                    <ul className="mt-auto flex flex-col gap-2 border-t border-white/10 pt-4">
                      {service.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex items-start gap-2 text-xs text-ink-400"
                        >
                          <span
                            className="mt-1 h-1 w-1 flex-none rounded-full"
                            style={{ backgroundColor: accent }}
                            aria-hidden="true"
                          />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </button>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </div>
    </Section>
  );
}
