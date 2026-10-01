"use client";

import { useRef } from "react";
import { siteSections } from "@/data/sections";
import { useJourneyFrame } from "@/hooks/useJourneyFrame";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { scrollToSection } from "@/lib/motion/scrollNav";
import type { StageId } from "@/types";

type TickState = "current" | "done" | "upcoming";

/**
 * Site-wide scroll-progress indicator — NOT the AI Playground's own internal
 * chapter rail (`components/game/PlaygroundRail.tsx`, scoped to chapter 06's
 * own 4 sub-experiences). This one always shows all 8 real site chapters
 * (`src/data/sections.ts` `siteSections`, sourced from the real `STAGE_IDS`)
 * and is mounted once at the page root (see `src/app/page.tsx`), fixed above
 * every chapter rather than nested inside any one of them.
 *
 * Driven entirely by the existing scroll-driven `journeyState` singleton
 * (`lib/motion/journeyState.ts`) via `useJourneyFrame` — no second scroll
 * listener or `ScrollTrigger`. The thin progress line's transform updates
 * every frame (a cheap imperative style write); tick/label state only
 * updates when `journeyState.activeStage` actually changes, via the same
 * ref-diffing pattern `components/layout/Header.tsx` already uses for its
 * nav active pill — so this never causes a React re-render on scroll.
 *
 * Renders both a tablet/desktop (vertical, right-edge) and mobile (bottom
 * bar) variant simultaneously, switched purely by Tailwind's existing
 * `md:`/breakpoint convention (matching `Header.tsx`'s own desktop-nav/
 * mobile-nav split) rather than a JS-computed device tier — avoids any
 * hydration flash-of-wrong-variant.
 *
 * Skipped entirely under `prefers-reduced-motion`: the rail's whole purpose
 * is tracking progress through the cinematic scroll-driven journey, and that
 * journey itself is already skipped for reduced-motion visitors site-wide
 * (see `components/motion/ScrollChoreographer.tsx`) — `journeyState` is
 * simply never updated in that mode, so a rail bound to it would otherwise
 * sit frozen at "01 · Hero, 0%" forever, which is worse than not showing it.
 */
export function ScrollProgressRail() {
  const prefersReducedMotion = usePrefersReducedMotion();

  const lastActiveStage = useRef<StageId | null>(null);
  const lastPercent = useRef(-1);

  const desktopTickRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const desktopLineRef = useRef<HTMLDivElement>(null);
  const desktopStatusRef = useRef<HTMLSpanElement>(null);
  const desktopPercentRef = useRef<HTMLSpanElement>(null);

  const mobileLineRef = useRef<HTMLSpanElement>(null);
  const mobileStatusRef = useRef<HTMLSpanElement>(null);
  const mobilePercentRef = useRef<HTMLSpanElement>(null);

  useJourneyFrame((state) => {
    if (desktopLineRef.current) desktopLineRef.current.style.transform = `scaleY(${state.globalProgress})`;
    if (mobileLineRef.current) mobileLineRef.current.style.transform = `scaleX(${state.globalProgress})`;

    const percent = Math.round(state.globalProgress * 100);
    if (percent !== lastPercent.current) {
      lastPercent.current = percent;
      if (desktopPercentRef.current) desktopPercentRef.current.textContent = `${percent}%`;
      if (mobilePercentRef.current) mobilePercentRef.current.textContent = `${percent}%`;
    }

    if (state.activeStage === lastActiveStage.current) return;
    lastActiveStage.current = state.activeStage;

    const activeIndex = siteSections.findIndex((section) => section.id === state.activeStage);
    const active = siteSections[activeIndex];

    desktopTickRefs.current.forEach((tick, i) => {
      if (!tick) return;
      const tickState: TickState = i < activeIndex ? "done" : i === activeIndex ? "current" : "upcoming";
      tick.dataset.state = tickState;
      if (tickState === "current") tick.setAttribute("aria-current", "step");
      else tick.removeAttribute("aria-current");
    });

    if (active) {
      const label = `${String(active.index).padStart(2, "0")}/${siteSections.length} · ${active.shortLabel}`;
      if (desktopStatusRef.current) desktopStatusRef.current.textContent = label;
      if (mobileStatusRef.current) mobileStatusRef.current.textContent = label;
    }
  });

  if (prefersReducedMotion) return null;

  return (
    <>
      {/* Tablet + desktop — vertical rail, right edge, clear of the fixed-top
          Header. Always showing: the "AI System · Online" line, the current
          chapter's title beside its dot, and the "07/8 · Vision  79%" status
          with the overall percent. The other chapters' titles appear when the
          rail is hovered or keyboard-focused. Labels are laid out beside the
          dots on small dark pills (taking no space, never intercepting
          clicks on the content under them). */}
      <nav
        aria-label="Site progress"
        className="group/rail pointer-events-none fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end md:flex xl:right-6"
      >
        <span aria-hidden="true" className="pointer-events-none absolute -top-7 right-0 whitespace-nowrap rounded-full bg-ink-950/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.28em] text-ink-500 backdrop-blur-sm">
          AI System <span className="text-emerald-400">· Online</span>
        </span>

        <div className="pointer-events-auto flex items-stretch gap-3">
          <ol className="flex flex-col items-end gap-1.5">
            {siteSections.map((section, i) => (
              <li key={section.id}>
                <button
                  type="button"
                  ref={(el) => {
                    desktopTickRefs.current[i] = el;
                  }}
                  data-state={i === 0 ? "current" : "upcoming"}
                  onClick={() => scrollToSection(`#${section.id}`)}
                  aria-label={`${section.shortLabel} — section ${section.index} of ${siteSections.length}`}
                  className="group relative flex items-center rounded-full p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                >
                  <span className="pointer-events-none absolute right-full top-1/2 mr-1.5 -translate-y-1/2 whitespace-nowrap rounded-full bg-ink-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400 backdrop-blur-sm group-data-[state=current]:text-ink-100 opacity-0 transition-opacity duration-300 group-data-[state=current]:opacity-100 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
                    {section.shortLabel}
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/20 transition-all duration-300 group-data-[state=current]:h-2.5 group-data-[state=current]:w-2.5 group-data-[state=current]:bg-brand-400 group-data-[state=current]:shadow-[0_0_8px_2px_rgba(253,106,80,0.55)] group-data-[state=done]:bg-emerald-400/70"
                  />
                </button>
              </li>
            ))}
          </ol>

          <div className="relative w-px self-stretch overflow-hidden rounded-full bg-white/10">
            <div
              ref={desktopLineRef}
              aria-hidden="true"
              style={{ transform: "scaleY(0)" }}
              className="absolute inset-x-0 top-0 h-full origin-top rounded-full bg-gradient-to-b from-brand-400 to-cyan-300"
            />
          </div>
        </div>

        <span aria-hidden="true" className="pointer-events-none absolute -bottom-7 right-0 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-ink-950/70 px-2 py-0.5 text-[10px] font-semibold text-ink-500 backdrop-blur-sm">
          <span ref={desktopStatusRef} className="uppercase tracking-[0.14em]">
            01/{siteSections.length} · Hero
          </span>
          <span ref={desktopPercentRef} className="text-ink-300">
            0%
          </span>
        </span>
      </nav>

      {/* Mobile — compact bottom bar, no per-section list (avoids horizontal
          overflow), matching the brief's own "03/08 · label + thin line +
          percent" example exactly. Its right end is kept clear for the
          music player, which docks there on phones
          (components/music/MusicPlayer.tsx). */}
      <nav
        aria-label="Site progress"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-white/10 bg-ink-950/85 py-2 pl-4 pr-[12rem] pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-lg md:hidden"
      >
        <span
          aria-hidden="true"
          ref={mobileStatusRef}
          className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-200"
        >
          01/{siteSections.length} · Hero
        </span>
        <span className="relative h-1 min-w-6 flex-1 overflow-hidden rounded-full bg-white/10">
          <span
            ref={mobileLineRef}
            aria-hidden="true"
            style={{ transform: "scaleX(0)" }}
            className="absolute inset-y-0 left-0 h-full w-full origin-left rounded-full bg-gradient-to-r from-brand-400 to-cyan-300"
          />
        </span>
        <span aria-hidden="true" ref={mobilePercentRef} className="shrink-0 text-[10px] font-semibold text-ink-500">
          0%
        </span>
      </nav>
    </>
  );
}
