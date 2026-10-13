"use client";

import { useEffect, useRef } from "react";
import { ensureGsapRegistered, gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Process choreography for chapter 04, ported from the light redesign
 * (development_v2 MotionDirector):
 *
 * - the glass panel settles from a slightly smaller, rounder card into
 *   place as it scrolls up (scrubbed);
 * - each step lights up as it reaches the reading line, and the rail fills
 *   alongside (the last step stays lit once reached);
 * - the "Run" step's response time ticks while that step is lit.
 *
 * `data-motion` on the panel opts the CSS into the dimmed/unlit starting
 * states, so without JS (or with reduced motion) every step shows in full.
 * Phones swipe the steps sideways instead, so all of them stay lit there.
 */
export function useProcessSteps() {
  const panelRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || reducedMotion) return;
    ensureGsapRegistered();
    panel.dataset.motion = "";
    let timer: ReturnType<typeof setInterval> | undefined;

    const mm = gsap.matchMedia(panel);
    mm.add({ wide: "(min-width: 761px)", phone: "(max-width: 760px)" }, (context) => {
      const steps = gsap.utils.toArray<HTMLElement>("[data-process-step]", panel);
      if (context.conditions?.phone) {
        steps.forEach((step) => step.classList.add("is-active"));
        return () => steps.forEach((step) => step.classList.remove("is-active"));
      }

      gsap.fromTo(
        panel,
        { scale: 0.94, borderRadius: "3.5rem" },
        { scale: 1, borderRadius: "2.25rem", ease: "none", scrollTrigger: { trigger: panel, start: "top bottom", end: "top 20%", scrub: true } }
      );
      steps.forEach((step, i) => {
        ScrollTrigger.create({ trigger: step, start: "top 65%", end: i === steps.length - 1 ? "bottom top" : "bottom 45%", toggleClass: "is-active" });
      });
      gsap.fromTo(
        "[data-process-rail]",
        { scaleY: 0 },
        { scaleY: 1, ease: "none", scrollTrigger: { trigger: "[data-process-steps]", start: "top 65%", end: "bottom 55%", scrub: true } }
      );
    });

    const ms = panel.querySelector<HTMLElement>("[data-ms]");
    const ticker = ms
      ? ScrollTrigger.create({
          trigger: ms.closest("[data-process-step]") ?? ms,
          start: "top 85%",
          end: "bottom top",
          onToggle: (self) => {
            clearInterval(timer);
            if (self.isActive) timer = setInterval(() => (ms.textContent = String(160 + Math.round(Math.random() * 45))), 1200);
          },
        })
      : undefined;

    return () => {
      clearInterval(timer);
      ticker?.kill();
      mm.revert();
      delete panel.dataset.motion;
    };
  }, [reducedMotion]);

  return panelRef;
}
