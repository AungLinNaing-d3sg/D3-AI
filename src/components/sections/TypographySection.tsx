"use client";

import { useCallback, useRef, type CSSProperties, type ReactNode } from "react";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/motion/Reveal";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { useJourneyFrame } from "@/hooks/useJourneyFrame";
import type { JourneyState } from "@/lib/motion/journeyState";
import { disciplineActivity, disciplineFocus } from "@/lib/motion/disciplineFocus";
import { damp } from "@/lib/motion/mathUtils";
import { services } from "@/data/services";
import { useHorizontalTrack } from "./useHorizontalTrack";
import { CodeToAppDemo } from "./demos/CodeToAppDemo";
import { BiDashboardDemo, PipelineBoardDemo } from "./demos/ServiceDemos";

/** The live product demo shown in each discipline's panel (from v2). */
const DEMOS: Record<string, ReactNode> = {
  data: <BiDashboardDemo />,
  dynamics: <PipelineBoardDemo />,
  digital: <CodeToAppDemo />,
};

/** One accent per discipline — order matches `services` (Data, Dynamics,
 * Digital). Applied consistently everywhere: active card border/glow/badge
 * and (see `DISCIPLINE_ACCENTS` in
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
 * bullet preserved in full — not truncated) that scroll or a direct click
 * can bring forward — via `disciplineFocus`, read by the 3D scene every
 * frame — so the active card, its sphere label, and its cluster's highlight
 * never fall out of sync. The cards are deliberately calm: hovering one
 * changes nothing, visually or in the sphere.
 */
export function TypographySection() {
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  /** Smoothed per-card focus (0..1) — see `onFrame`. */
  const focusRef = useRef<number[]>(services.map(() => 0));
  const lastFrameRef = useRef(0);

  const onFrame = useCallback((state: JourneyState) => {
    const local = state.progress.typography;
    const scrollIndex = Math.min(
      services.length - 1,
      Math.max(0, Math.floor(local * services.length)),
    );
    // A click's pin persists until released by scroll (see
    // TypographyScene.tsx); scroll drives it the rest of the time — see
    // disciplineFocus.ts.
    const pinned = disciplineFocus.pinned;
    const activeIndex = pinned ?? scrollIndex;

    const now = performance.now();
    const delta = Math.min((now - (lastFrameRef.current || now)) / 1000, 0.1);
    lastFrameRef.current = now;

    // The same activity curve the sphere turns/dollies/highlights with, so
    // the active card comes forward exactly as its cluster does; damped so
    // a click's instant pin still eases in. Inactive cards recede in
    // prominence only relative to whichever card currently leads.
    const focus = focusRef.current;
    let lead = 0;
    services.forEach((_, index) => {
      const target = disciplineActivity(local, index, services.length, pinned);
      focus[index] = damp(focus[index] ?? 0, target, 6, delta);
      lead = Math.max(lead, focus[index] ?? 0);
    });

    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      card.dataset.active = index === activeIndex ? "true" : "false";
      const value = focus[index] ?? 0;
      card.style.setProperty("--focus", value.toFixed(3));
      card.style.setProperty("--prominence", (1 - (lead - value) * 0.28).toFixed(3));
    });
  }, []);

  useJourneyFrame(onFrame);
  const trackStageRef = useHorizontalTrack();

  /** Pins a discipline as active — persists (read by the 3D scene's
   * `disciplineFocus.pinned`) until the user scrolls far enough away (see
   * `TypographyScene.tsx`), so click and scroll both stay in control
   * without fighting each other. */
  const selectDiscipline = useCallback((index: number) => {
    disciplineFocus.pinned = index;
  }, []);

  return (
    <Section
      stageId="typography"
      ariaLabelledBy="typography-heading"
      className="min-h-[85vh] md:min-h-[100vh] lg:min-h-[110vh]"
    >
      <Container data-depth-exit className="approach-v2 pt-16 md:pt-24">
        <div className="approach-v2-head">
          <Reveal as="h2" id="typography-heading" variant="maskLines" className="v2-heading">
            Three disciplines. <span className="v2-accent">One intelligent system.</span>
          </Reveal>
          <Reveal as="p" delay={0.15} className="v2-lead">
            Data, Dynamics and Digital work as one connected system, the sphere behind this section. Select a
            discipline, or keep scrolling, to see where it fits.
          </Reveal>
        </div>
      </Container>

      {/* Sticky right-to-left track on wide screens (useHorizontalTrack).
          Each panel is a real button: click (or scroll) brings its cluster
          forward in the sphere via `disciplineFocus`. */}
      <div ref={trackStageRef} className="track-stage">
        <div className="track-sticky">
          <div className="approach-v2-panels" data-track>
            {services.map((service, index) => {
              const accent = DISCIPLINE_ACCENTS[index % DISCIPLINE_ACCENTS.length] ?? "#ffffff";
              return (
                <div key={service.slug} className="approach-v2-slot">
                  <article
                    ref={(node) => {
                      cardRefs.current[index] = node;
                    }}
                    data-active="false"
                    aria-labelledby={`discipline-${index}`}
                    style={{ "--accent": accent } as CSSProperties}
                    className="approach-v2-panel v2-glass"
                    data-panel-tilt
                  >
                    {/* One full-size hit target: click / Enter anywhere on the
                        panel brings its cluster forward in the sphere. */}
                    <button
                      type="button"
                      className="approach-v2-hit"
                      onClick={() => selectDiscipline(index)}
                      aria-label={`Focus ${service.title} in the connected system`}
                    />
                    <span className="approach-v2-spot" aria-hidden="true" />
                    <span className="v2-numeral" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="approach-v2-copy">
                      <ServiceIcon name={service.icon} className="approach-v2-icon" style={{ color: accent }} />
                      <h3 id={`discipline-${index}`} data-track-title className="approach-v2-title">
                        {service.title}
                      </h3>
                      <p data-track-copy className="approach-v2-summary">
                        {service.summary}
                      </p>
                      <ul className="v2-bullets" data-track-copy>
                        {service.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="v2-demo" data-track-copy>
                      {DEMOS[service.slug]}
                    </div>
                    <span className="approach-v2-active" aria-hidden="true">
                      In focus
                    </span>
                  </article>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}
