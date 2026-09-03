"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { ensureGsapRegistered, gsap } from "@/lib/motion/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/** The small, fixed set of host elements `<Reveal>` actually needs to
 * render as. Kept as a closed union (rather than a fully generic
 * `ElementType`) so TypeScript can still correctly type `ref`/`children`
 * for each — a fully polymorphic `as` prop collapses JSX prop typing to
 * `never`. */
type RevealTag = "div" | "p" | "span" | "h1" | "h2" | "h3";

interface RevealProps {
  children: ReactNode;
  /** Host element to render — defaults to a `div`. */
  as?: RevealTag;
  className?: string;
  /** Stagger delay in seconds, for revealing a group in sequence. */
  delay?: number;
  /** Vertical offset (px) the content travels in from. */
  y?: number;
  /** Passed through — lets a wrapping `<section>` reference this element via
   * `aria-labelledby`. */
  id?: string;
}

/**
 * Scroll-triggered text/element entrance (and reverse-on-scroll-up exit)
 * animation, built on GSAP + ScrollTrigger's `toggleActions` (play on the
 * way down, reverse on the way back up) rather than `scrub`, since a single
 * one-shot entrance reads better for typography than a scrubbed transform.
 *
 * Fully inert when the user prefers reduced motion: content renders at full
 * opacity immediately, no animation is scheduled.
 */
export function Reveal({ children, as = "div", className, delay = 0, y = 28, id }: RevealProps) {
  const Tag = as;
  const ref = useRef<HTMLElement | null>(null);
  // A callback ref (rather than an object ref) is contravariant in its
  // element type, so this one function works for whichever concrete host
  // element `Tag` renders as (div/p/span/h1/h2/h3) without needing a type
  // assertion.
  const setRef = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion) return;

    ensureGsapRegistered();

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          delay,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );
    });

    return () => ctx.revert();
  }, [prefersReducedMotion, delay, y]);

  const classes = [className, prefersReducedMotion ? "" : "motion-reveal"]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag ref={setRef} className={classes} id={id}>
      {children}
    </Tag>
  );
}
