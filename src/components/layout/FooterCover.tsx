"use client";

import { useEffect } from "react";
import { ensureGsapRegistered, gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Footer "cover" transition, ported from the light redesign (development_v2):
 * as the footer swipes up, the final chapter is held in place and sinks back
 * under a darkening veil until the footer covers the whole screen.
 *
 * Holding is a counter-translate of the chapter (not a GSAP pin) so it works
 * under v1.1's depth-exit transforms. The CTA's 3D core anchors itself to
 * that chapter's on-screen position, so it is held too without touching any
 * 3D code; the veil sits above the canvas and dims both together.
 */
export function FooterCover() {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const footer = document.querySelector<HTMLElement>(".site-foot");
    const section = document.querySelector<HTMLElement>('[data-stage="cta"]');
    if (!footer || !section) return;
    ensureGsapRegistered();

    const veil = document.createElement("div");
    veil.className = "foot-cover-veil";
    veil.setAttribute("aria-hidden", "true");
    section.append(veil);

    const ctx = gsap.context(() => {
      const range = { trigger: footer, start: "top bottom", end: "top top", scrub: true, invalidateOnRefresh: true };
      // The footer is at least one screen tall (CSS), so between its top
      // entering at the bottom and reaching the top the page scrolls exactly
      // one viewport: moving the chapter down by that much holds it still.
      gsap.fromTo(section, { y: 0 }, { y: () => window.innerHeight, ease: "none", scrollTrigger: range });
      gsap.fromTo(veil, { opacity: 0 }, { opacity: 0.75, ease: "none", scrollTrigger: range });
    });
    ScrollTrigger.refresh();

    return () => {
      ctx.revert();
      veil.remove();
    };
  }, [reducedMotion]);

  return null;
}
