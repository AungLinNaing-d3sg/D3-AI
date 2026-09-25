"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { ensureGsapRegistered, gsap, SplitText } from "@/lib/motion/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";

/** The small, fixed set of host elements `<Reveal>` actually needs to
 * render as. Kept as a closed union (rather than a fully generic
 * `ElementType`) so TypeScript can still correctly type `ref`/`children`
 * for each — a fully polymorphic `as` prop collapses JSX prop typing to
 * `never`. */
type RevealTag = "div" | "p" | "span" | "h1" | "h2" | "h3";

/**
 * - `"fade"` (default) — the original lightweight vertical fade/slide, used
 *   for normal body content, labels, cards, buttons.
 * - `"chars"` / `"words"` — character/word stagger with a subtle Z-axis
 *   depth + scale settle, reserved for major headlines/keywords only (hero
 *   titles, section headings). Built on GSAP's own `SplitText` plugin (see
 *   lib/motion/gsap.ts), which keeps the original sentence available to
 *   assistive tech via an auto-managed `aria-label` while the visual pieces
 *   are marked `aria-hidden`.
 * - `"blur"` — a blur-to-sharp fade, for supporting headline copy that sits
 *   just below a `"chars"`/`"words"` title.
 * - `"mask"` — a left-to-right clip-path "curtain" reveal combined with a
 *   subtle blur/depth settle, for premium hero copy that should read as
 *   materialising rather than a plain fade or a literal per-character
 *   typewriter.
 */
type RevealVariant = "fade" | "chars" | "words" | "blur" | "mask";

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
  /** Animation treatment — see `RevealVariant` above. Defaults to `"fade"`
   * so every existing call site keeps its current behaviour unchanged. */
  variant?: RevealVariant;
  /** Starting blur (px) for the `"blur"` variant — lower for a gentler,
   * more restrained settle. */
  blur?: number;
  /** Overrides the `"blur"` variant's duration (seconds). */
  duration?: number;
}

/**
 * Scroll-triggered text/element entrance (and reverse-on-scroll-up exit)
 * animation, built on GSAP + ScrollTrigger's `toggleActions` (play on the
 * way down, reverse on the way back up) rather than `scrub`, since a single
 * one-shot entrance reads better for typography than a scrubbed transform.
 *
 * Fully inert when the user prefers reduced motion: content renders at full
 * opacity immediately, no animation is scheduled. Every variant animates
 * *to* fully visible/readable text and never leaves content permanently
 * hidden — if a variant's setup throws for any reason, the element still
 * starts from the same CSS-only `.motion-reveal` state the `<noscript>`
 * fallback in src/app/layout.tsx already un-hides for no-JS users.
 */
export function Reveal({
  children,
  as = "div",
  className,
  delay = 0,
  y = 28,
  id,
  variant = "fade",
  blur = 14,
  duration,
}: RevealProps) {
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
  const { isCompact } = useDeviceCapability();

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion) return;

    ensureGsapRegistered();

    // Only ever set for the "chars"/"words" variants — tracked outside
    // `gsap.context` because `SplitText.revert()` restores the element's
    // original `innerHTML` and is a separate cleanup step from
    // `ctx.revert()` (which only kills the tweens/ScrollTriggers created
    // inside the context, not SplitText's own DOM mutation).
    let split: SplitText | undefined;

    const scrollTrigger = {
      trigger: el,
      start: "top 85%",
      toggleActions: "play none none reverse",
    } as const;

    const ctx = gsap.context(() => {
      if (variant === "chars" || variant === "words") {
        // GSAP's `autoAlpha` animates a target's own `visibility` between
        // `"hidden"` and `"inherit"` (never `"visible"`) — see
        // node_modules/gsap/CSSPlugin.js. That's exactly right when `<Reveal>`
        // animates `el` itself (the `"fade"`/`"blur"` variants below), but
        // here the *children* (each split char/word span) are what animate;
        // if `el` kept the CSS `.motion-reveal` class's `visibility: hidden`,
        // every child's `"inherit"` end-state would still resolve to hidden
        // and the headline would stay permanently invisible — precisely the
        // "3D animation shows but content/text never appears" failure this
        // feature is required to eliminate. Unhiding `el` itself immediately
        // (synchronously, before any paint) fixes that; the headline still
        // reads as hidden-until-scrolled-into-view because every individual
        // char/word span starts its own `visibility: hidden`.
        gsap.set(el, { autoAlpha: 1 });
        split = SplitText.create(el, { type: variant });
        const targets = variant === "chars" ? split.chars : split.words;
        // Skip the per-character Z-depth/rotation transform on compact
        // (mobile) devices — a plain fade/slide is far cheaper to composite
        // per-frame across dozens of split spans on a low-end mobile GPU,
        // while still keeping the same stagger reveal rhythm.
        gsap.fromTo(
          targets,
          isCompact
            ? { autoAlpha: 0, y }
            : {
                autoAlpha: 0,
                y,
                z: -40,
                rotateX: -18,
                scale: 0.94,
                transformPerspective: 600,
                transformOrigin: "50% 100%",
              },
          {
            autoAlpha: 1,
            y: 0,
            ...(isCompact ? {} : { z: 0, rotateX: 0, scale: 1 }),
            duration: 0.8,
            delay,
            ease: "power3.out",
            stagger: variant === "chars" ? 0.018 : 0.05,
            scrollTrigger,
          }
        );
        return;
      }

      if (variant === "mask") {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: y * 0.5, clipPath: "inset(0% 100% 0% 0%)", filter: "blur(6px)" },
          {
            autoAlpha: 1,
            y: 0,
            clipPath: "inset(0% 0% 0% 0%)",
            filter: "blur(0px)",
            duration: 1.1,
            delay,
            ease: "power3.out",
            scrollTrigger,
          }
        );
        return;
      }

      if (variant === "blur") {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y, filter: `blur(${blur}px)` },
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: duration ?? 1,
            delay,
            ease: "power3.out",
            scrollTrigger,
          }
        );
        return;
      }

      gsap.fromTo(
        el,
        { autoAlpha: 0, y },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          delay,
          ease: "power3.out",
          scrollTrigger,
        }
      );
    });

    return () => {
      ctx.revert();
      split?.revert();
    };
  }, [prefersReducedMotion, delay, y, variant, isCompact, blur, duration]);

  const classes = [className, prefersReducedMotion ? "" : "motion-reveal"]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag ref={setRef} className={classes} id={id}>
      {children}
    </Tag>
  );
}
