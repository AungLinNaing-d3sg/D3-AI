"use client";

import { useEffect, useRef, type RefObject } from "react";
import dynamic from "next/dynamic";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import { useWebglSupported } from "@/hooks/useWebglSupported";
import { ctaPhaseAt, ctaStory, ctaSyncAt, type CtaPhase } from "@/lib/motion/ctaStory";
import { ensureGsapRegistered, ScrollTrigger } from "@/lib/motion/gsap";

const CtaStillCanvas = dynamic(() => import("@/components/three/CtaStillCanvas"), {
  ssr: false,
  loading: () => null,
});

const PHASE_LABELS: Record<CtaPhase, string> = {
  enter: "Dormant",
  connect: "Connecting",
  intelligence: "Synchronising",
  complete: "Stable",
};

/**
 * Drives Section 8's scroll story (lib/motion/ctaStory.ts) from one
 * `ScrollTrigger` on the section — the same GSAP/Lenis scroll architecture
 * as the rest of the journey, no separate scroll container or timer. The
 * raw progress goes to the 3D core (which damps it), to the HTML as the
 * `--cta-progress` custom property and `data-cta-phase` attribute, and to
 * the small status readouts — written straight to the DOM, and only when
 * they change, so scrolling never re-renders React. Reduced motion: the
 * story is shown in its settled, final state.
 */
function useCtaStory(stageRef: RefObject<HTMLDivElement | null>, prefersReducedMotion: boolean, hold: boolean) {
  useEffect(() => {
    const section = stageRef.current?.closest<HTMLElement>("[data-stage]");
    const anchor = stageRef.current?.querySelector<HTMLElement>("[data-cta-anchor]");
    if (!section) return;
    const phaseReadout = section.querySelector<HTMLElement>('[data-cta-readout="phase"]');
    const syncReadout = section.querySelector<HTMLElement>('[data-cta-readout="sync"]');
    let lastPhase: CtaPhase | null = null;
    let lastSync = -1;
    // Desktop: the anchor (and so the 3D core and its annotations) holds its
    // place in frame while the form scrolls past, by being translated down
    // exactly as far as the section has scrolled above the viewport — until
    // it reaches the section's end. (Not `position: sticky`: the page's
    // global overflow rules make <body> the sticky scroll container.)
    const holdAnchor = () => {
      if (!anchor) return;
      if (!hold) {
        anchor.style.removeProperty("transform");
        return;
      }
      const maxHold = Math.max(section.offsetHeight - anchor.offsetTop - anchor.offsetHeight - 24, 0);
      const offset = Math.min(Math.max(-section.getBoundingClientRect().top, 0), maxHold);
      anchor.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    };
    const write = (progress: number) => {
      holdAnchor();
      ctaStory.progress = progress;
      section.style.setProperty("--cta-progress", progress.toFixed(4));
      const phase = ctaPhaseAt(progress);
      if (phase !== lastPhase) {
        lastPhase = phase;
        section.dataset.ctaPhase = phase;
        if (phaseReadout) phaseReadout.textContent = PHASE_LABELS[phase];
      }
      const sync = ctaSyncAt(progress);
      if (sync !== lastSync) {
        lastSync = sync;
        if (syncReadout) syncReadout.textContent = String(sync).padStart(3, "0");
      }
    };
    const reset = () => {
      anchor?.style.removeProperty("transform");
      section.style.removeProperty("--cta-progress");
      delete section.dataset.ctaPhase;
      if (phaseReadout) phaseReadout.textContent = PHASE_LABELS.complete;
      if (syncReadout) syncReadout.textContent = "100";
    };
    // Reduced motion: the story stays at its settled end state; the trigger
    // still runs so the anchor keeps holding the (static) core in frame.
    const storyAt = (progress: number) => (prefersReducedMotion ? 1 : progress);
    ensureGsapRegistered();
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top bottom",
      end: "bottom bottom",
      onUpdate: (self) => write(storyAt(self.progress)),
      onRefresh: (self) => write(storyAt(self.progress)),
    });
    write(storyAt(trigger.progress));
    return () => {
      trigger.kill();
      ctaStory.progress = 0;
      reset();
    };
  }, [stageRef, prefersReducedMotion, hold]);
}

/**
 * No-WebGL stand-in: the same intelligence core, drawn once in SVG inside
 * the anchor — faceted glass column, gyroscope rings, dark collars and
 * band, stacked plates, lit data paths and a warm nucleus above an
 * octagonal plinth — in the site's theme tokens, in its settled state.
 */
function StaticCore() {
  return (
    <svg viewBox="0 0 300 420" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="cta-core-glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="0.35" stopColor="#ffffff" stopOpacity="0.03" />
          <stop offset="0.7" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.14" />
        </linearGradient>
        <linearGradient id="cta-core-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--color-ink-500)" }} />
          <stop offset="1" style={{ stopColor: "var(--color-ink-800)" }} />
        </linearGradient>
        <radialGradient id="cta-core-nucleus">
          <stop offset="0" style={{ stopColor: "var(--color-brand-300)" }} stopOpacity="0.95" />
          <stop offset="0.35" style={{ stopColor: "var(--color-brand-500)" }} stopOpacity="0.45" />
          <stop offset="1" style={{ stopColor: "var(--color-brand-700)" }} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cta-core-shadow">
          <stop offset="0" stopColor="#000" stopOpacity="0.75" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="150" cy="392" rx="120" ry="16" fill="url(#cta-core-shadow)" />
      <path d="M62 372 L238 372 L230 388 L70 388 Z" fill="url(#cta-core-metal)" />
      <path d="M78 364 L222 364 L238 372 L62 372 Z" fill="var(--color-ink-600)" opacity="0.8" />
      <line x1="96" y1="368" x2="204" y2="368" stroke="var(--color-brand-400)" strokeOpacity="0.55" strokeWidth="1" />

      <circle cx="150" cy="195" r="90" fill="url(#cta-core-nucleus)" opacity="0.35" />

      <g fill="none" stroke="var(--color-ink-300)" strokeOpacity="0.35" strokeWidth="0.8">
        <ellipse cx="150" cy="198" rx="132" ry="26" />
        <ellipse cx="150" cy="198" rx="142" ry="54" transform="rotate(-18 150 198)" strokeOpacity="0.22" />
      </g>

      <g stroke="var(--color-ink-100)" strokeOpacity="0.2" strokeWidth="1" fill="url(#cta-core-glass)">
        <path d="M122 50 L178 50 L222 96 L222 300 L178 346 L122 346 L78 300 L78 96 Z" />
        <line x1="128" y1="50" x2="128" y2="346" strokeOpacity="0.08" />
        <line x1="172" y1="50" x2="172" y2="346" strokeOpacity="0.08" />
      </g>

      <g fill="url(#cta-core-metal)" stroke="var(--color-ink-400)" strokeOpacity="0.4" strokeWidth="0.75">
        <rect x="112" y="38" width="76" height="14" rx="2" />
        <rect x="112" y="344" width="76" height="14" rx="2" />
        <rect x="76" y="196" width="148" height="4" rx="1" />
        <rect x="100" y="118" width="100" height="5" rx="1" opacity="0.9" />
        <rect x="100" y="270" width="100" height="5" rx="1" opacity="0.9" />
      </g>

      <g fill="none" stroke="var(--color-brand-400)" strokeWidth="1" strokeOpacity="0.7" strokeLinecap="round">
        <path d="M104 108 Q150 96 196 108" />
        <path d="M104 262 Q150 250 196 262" />
        <path d="M104 108 Q126 150 146 190" />
        <path d="M196 262 Q174 230 154 202" />
        <path d="M196 108 Q176 160 156 190" />
        <path d="M104 262 Q124 232 144 202" />
      </g>
      <g fill="var(--color-brand-300)">
        <circle cx="104" cy="108" r="2.5" />
        <circle cx="196" cy="108" r="2.5" />
        <circle cx="104" cy="262" r="2.5" />
        <circle cx="196" cy="262" r="2.5" />
      </g>
      <path d="M150 180 L160 196 L150 214 L140 196 Z" fill="var(--color-brand-400)" />
    </svg>
  );
}

/**
 * Quiet engineering details framing the core, like the annotations on a
 * product drawing: a name and location plate, a vertical activation rail
 * with its four phase ticks, and a status/sync readout. Tiny, low contrast,
 * decorative — the real story steps are in the content column — and hidden
 * on the smallest screens.
 */
function CoreAnnotations() {
  return (
    <div className="cta-annotations max-sm:hidden">
      <div className="cta-annotation cta-annotation--plate">
        <span className="cta-annotation-title">Intelligence core</span>
        <span>01°19′N · 103°54′E</span>
      </div>
      <div className="cta-rail">
        <span className="cta-rail-fill" />
        {[0, 1, 2, 3].map((tick) => (
          <span key={tick} className="cta-rail-tick" style={{ top: `${tick * 33.333}%` }} />
        ))}
      </div>
      <div className="cta-annotation cta-annotation--status">
        <span className="cta-status-dot" />
        <span data-cta-readout="phase">{PHASE_LABELS.complete}</span>
        <span className="cta-annotation-divider" />
        <span>
          Sync <span data-cta-readout="sync">100</span>%
        </span>
      </div>
    </div>
  );
}

/**
 * Section 8's background layer, underneath the content. It covers the whole
 * section; inside it, `[data-cta-anchor]` is the box the intelligence core
 * is framed into:
 * - desktop: the right side, held in frame below the header (see
 *   `useCtaStory`) so the core and its annotations stay put while the form
 *   scrolls past;
 * - tablet: top right, beside the heading;
 * - mobile: top right and partly off-canvas — a deliberate cropped view
 *   that keeps it above and away from the copy.
 *
 * - Live scene (default): the anchor holds no 3D itself; the shared
 *   background canvas places the core into the anchor's on-screen rect every
 *   frame (see `ANCHOR_SELECTOR` in three/scenes/CtaScene.tsx).
 * - Reduced motion: a static render of the settled core and its studio in
 *   an on-demand canvas covering the section (CtaStillCanvas), redrawn only
 *   when the held anchor moves — nothing animates.
 * - No WebGL: a CSS studio light and a static SVG core in the anchor.
 */
export function CtaStage() {
  const { enableScene, prefersReducedMotion, quality, tier } = useDeviceCapability();
  const webglSupported = useWebglSupported();
  const stageRef = useRef<HTMLDivElement>(null);
  const still = webglSupported && !enableScene && prefersReducedMotion;
  useCtaStory(stageRef, prefersReducedMotion, tier === "desktop");

  return (
    <div ref={stageRef} data-cta-stage aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      {still ? <CtaStillCanvas quality={quality} /> : null}
      {webglSupported ? null : <div className="cta-static-studio absolute inset-0" />}
      <div
        data-cta-anchor
        className="absolute right-[-12%] top-[4.25rem] h-[15rem] w-[74%] will-change-transform sm:right-[-2%] sm:top-[5rem] sm:h-[18rem] sm:w-[58%] md:right-[15%] md:top-[7.5rem] md:h-[24rem] md:w-[44%] lg:left-[47%] lg:right-[13%] lg:top-[max(5.5rem,9svh)] lg:h-[min(80svh,52rem)] lg:w-auto"
      >
        {webglSupported ? null : <StaticCore />}
        <CoreAnnotations />
      </div>
    </div>
  );
}
