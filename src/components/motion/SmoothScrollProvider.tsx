"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { ensureGsapRegistered, gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface SmoothScrollProviderProps {
  children: ReactNode;
}

/**
 * Wires up Lenis smooth scrolling and syncs it with GSAP's ticker +
 * ScrollTrigger, following the officially documented Lenis/GSAP recipe
 * (https://lenis.darkroom.engineering/). Skipped entirely when the user has
 * requested reduced motion — the page then falls back to native scrolling,
 * and `ScrollChoreographer`/`Reveal` also no-op in that mode.
 */
export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    ensureGsapRegistered();

    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      touchMultiplier: 1.1,
    });

    lenis.on("scroll", ScrollTrigger.update);

    function onTick(time: number) {
      lenis.raf(time * 1000);
    }

    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(onTick);
      lenis.destroy();
    };
  }, [prefersReducedMotion]);

  return <>{children}</>;
}
