"use client";

import { useEffect } from "react";
import { ensureGsapRegistered, gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Invisible controller for the homepage's (intentionally small) scroll
 * motion. Sections stay plain server-rendered markup and opt in through
 * data attributes:
 *
 * - `data-reveal`  short fade-up as it first enters (adds `.is-in`)
 * - `data-count`   number counts up when it enters
 *
 * plus the Process step highlight and its progress rail. Everything is
 * created inside one `gsap.context` and reverted on unmount; nothing runs
 * under reduced motion (globals.css then shows final states).
 */
export function MotionDirector() {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    ensureGsapRegistered();

    const ctx = gsap.context(() => {
      gsap.set("[data-reveal]", { y: 16 });
      ScrollTrigger.batch("[data-reveal]", {
        start: "top 92%",
        once: true,
        onEnter: (batch) => {
          batch.forEach((node) => node.classList.add("is-in"));
          gsap.to(batch, { y: 0, opacity: 1, duration: 0.7, ease: "power2.out", stagger: 0.06, clearProps: "transform" });
        },
      });

      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((node) => {
        const value = { v: 0 };
        gsap.to(value, {
          v: Number(node.dataset.count),
          duration: 1.6,
          ease: "power2.out",
          scrollTrigger: { trigger: node, start: "top 92%", once: true },
          onUpdate: () => { node.textContent = String(Math.round(value.v)); },
        });
      });

      gsap.utils.toArray<HTMLElement>(".step").forEach((step) => {
        ScrollTrigger.create({ trigger: step, start: "top 65%", end: "bottom 45%", toggleClass: "is-active" });
      });
      if (document.querySelector(".rail i")) {
        gsap.to(".rail i", { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".steps", start: "top 65%", end: "bottom 55%", scrub: true } });
      }
    });

    // Late-loading webfonts shift layout; re-measure trigger positions once.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => ctx.revert();
  }, [reducedMotion]);

  return null;
}
