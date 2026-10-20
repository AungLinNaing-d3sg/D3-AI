"use client";

import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { useJourneyFrame } from "@/hooks/useJourneyFrame";
import { universeStations } from "@/data/journey";
import { universeFocus } from "@/lib/motion/universeFocus";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/** Plain-language description of the shared 3D backdrop (see
 * three/scenes/UniverseScene.tsx — a single live coding-terminal scene, not a
 * per-statistic visual, so every card shares this same caption) — read
 * alongside the real statistic so non-visual/reduced-motion users still know
 * what the decorative canvas is depicting, without duplicating the
 * statistic text itself. */
/** Glyphs a stat token cycles through while it "decodes". */
const DECODE_GLYPHS = "01<>/#%&*+=ABCDEF0123456789";
const DECODE_MS = 900;

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
 *
 * Cinematic layer (motion allowed): the cards rise in one after another as
 * the list enters; each token decodes from terminal glyphs into its value
 * — on entry, and again whenever its card becomes the live one — and the
 * live card shows a blinking caret and a sync bar filling through its
 * share of the chapter. Reduced motion shows everything settled.
 */
export function NumbersSection() {
  const cardRefs = useRef<Array<HTMLLIElement | null>>([]);
  const tokenRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const listRef = useRef<HTMLUListElement>(null);
  const activeRef = useRef(-1);
  const frames = useRef<number[]>([]);
  const reducedMotion = usePrefersReducedMotion();
  const motionRef = useRef(!reducedMotion);
  useEffect(() => {
    motionRef.current = !reducedMotion;
  }, [reducedMotion]);

  /** Decodes token `index` from glyphs into its real text, left to right. */
  const decode = useCallback((index: number, delay = 0) => {
    const el = tokenRefs.current[index];
    const text = universeStations[index]?.stat.token;
    if (!el || !text || !motionRef.current) return;
    cancelAnimationFrame(frames.current[index] ?? 0);
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const p = Math.max(0, (now - start) / DECODE_MS);
      if (p >= 1) {
        el.textContent = text;
        return;
      }
      el.textContent = Array.from(text, (ch, i) =>
        ch === " " || p > (i + 1) / text.length ? ch : DECODE_GLYPHS[Math.floor(Math.random() * DECODE_GLYPHS.length)]
      ).join("");
      frames.current[index] = requestAnimationFrame(tick);
    };
    frames.current[index] = requestAnimationFrame(tick);
  }, []);

  // Cards rise in one after another, and every token decodes, as the list
  // first comes into view.
  useEffect(() => {
    const list = listRef.current;
    if (!list || reducedMotion || typeof IntersectionObserver === "undefined") return;
    list.dataset.motion = "";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        list.classList.add("is-in");
        universeStations.forEach((_, i) => decode(i, 250 + i * 140));
        observer.disconnect();
      },
      { threshold: 0.2 }
    );
    observer.observe(list);
    const pending = frames.current;
    return () => {
      observer.disconnect();
      pending.forEach((id) => cancelAnimationFrame(id));
      delete list.dataset.motion;
      list.classList.remove("is-in");
    };
  }, [reducedMotion, decode]);

  // The live statistic follows where the cards actually are on screen,
  // over a scroll window split evenly between the stats. Stacked (phones,
  // tablets) the window opens as the list's top reaches 75% down the
  // viewport and closes as its bottom passes 35%, so the live card is the
  // one in the lower middle of the screen; in one row (wide screens) the
  // stats light in turn while the row crosses the screen. Outside the window none is live. The 3D terminal
  // follows the same index (`universeFocus`).
  const onFrame = useCallback(
    () => {
      const list = listRef.current;
      if (!list) return;
      const rect = list.getBoundingClientRect();
      const vh = window.innerHeight;
      const count = universeStations.length;
      // One row (wide screens): the whole window runs while the row is on
      // screen — from its top reaching 85% down to its top reaching 10%.
      const singleRow = rect.height < vh * 0.4;
      const p = singleRow ? (vh * 0.85 - rect.top) / (vh * 0.75) : (vh * 0.75 - rect.top) / (rect.height + vh * 0.4);
      const active = p > 0 && p < 1 ? Math.min(count - 1, Math.floor(p * count)) : -1;
      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        card.dataset.active = index === active ? "true" : "false";
        const fill = Math.min(1, Math.max(0, p * count - index));
        card.style.setProperty("--stat-progress", fill.toFixed(3));
      });
      universeFocus.index = active;
      // The newly live card re-decodes its value, in step with the terminal.
      if (active !== activeRef.current) {
        activeRef.current = active;
        if (active >= 0) decode(active);
      }
    },
    [decode]
  );
  useEffect(
    () => () => {
      universeFocus.index = -1;
    },
    []
  );

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
          (see `universeFocus`). */}
      <div className="relative flex h-auto flex-col justify-center gap-8 py-10 md:min-h-[100svh] md:gap-8 md:py-16 lg:gap-10 lg:py-20">
        <Container data-depth-exit className="flex flex-col gap-10">
          <SectionHeading
            headingId="universe-heading"
            stage="universe"
            title={
              <>
                A data universe built from <span className="v2-accent">real numbers</span>
              </>
            }
            description="A live coding terminal, typing behind this section — because these numbers are the product of real, ongoing work, not marketing copy."
            scrim
          />

          {/* The active statistic comes forward in depth (scale, Z, full
              opacity) while the others step back a touch — see
              `.depth-stat` in globals.css, keyed off the same `data-active`
              the terminal scene syncs to. */}
          <Reveal as="div" variant="depth" delay={0.1}>
          <ul ref={listRef} className="depth-stage depth-stat-list grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {universeStations.map(({ stat }, index) => (
              <li
                key={stat.label}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                data-active="false"
                data-depth-tilt
                style={{ "--halo-color": "#f14a30", "--i": index } as CSSProperties}
                className="glass-panel glass-card data-active-halo depth-tilt depth-stat group relative p-6 pt-8"
              >
                <span aria-hidden="true" className="depth-glare" />
                <span aria-hidden="true" className="card-spot" />
                <span aria-hidden="true" className="card-edge" />
                <span aria-hidden="true" className="stat-index">
                  {String(index + 1).padStart(2, "0")} / {String(universeStations.length).padStart(2, "0")}
                </span>
                {/* Token floats outside the card body as its own chip
                    rather than sitting flush inside the box — an
                    asymmetric layout instead of a flat rectangle. Bounded by
                    both `left`/`right` insets (rather than left-only,
                    content-width) so it can never grow past its own card,
                    however long a future token turns out to be. */}
                <span className="depth-stat-token absolute -top-4 left-5 right-5 inline-flex items-center justify-center rounded-2xl border border-brand-400/40 bg-ink-950 px-4 py-1 text-center shadow-[0_10px_30px_-15px_rgba(0,0,0,0.85)]">
                  <span
                    ref={(node) => {
                      tokenRefs.current[index] = node;
                    }}
                    className="stat-token-text type-display-stat text-balance text-brand-300"
                  >
                    {stat.token}
                  </span>
                </span>
                <p style={{ "--layer": 4 } as CSSProperties} className="depth-layer type-eyebrow text-brand-300">
                  {stat.label}
                  <span aria-hidden="true" className="stat-caret" />
                </p>
                <p className="depth-stat-copy mt-3 text-sm leading-relaxed text-ink-300">{stat.description}</p>
                <p className="sr-only">{UNIVERSE_VISUAL_CAPTION}</p>
                <span aria-hidden="true" className="stat-sync">
                  <i />
                </span>
              </li>
            ))}
          </ul>
          </Reveal>
        </Container>
      </div>
    </Section>
  );
}
