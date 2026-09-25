"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ensureGsapRegistered, gsap } from "@/lib/motion/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import { useJourneyFrame } from "@/hooks/useJourneyFrame";
import { damp } from "@/lib/motion/mathUtils";

interface HeroGreetingProps {
  text: string;
  id: string;
  className?: string;
}

interface ParticleLayout {
  startXPercent: number;
  startYPercent: number;
  endXPercent: number;
  endYPercent: number;
  size: number;
  glowBlur: number;
  glowSpread: number;
  hue: "brand" | "cyan";
}

/** Deterministic pseudo-random hash — NOT `Math.random()`. This component
 * renders in the normal server-rendered tree (unlike the client-only R3F
 * `Experience`), so the initial particle layout must be identical on the
 * server and the client's first paint, or React logs a hydration mismatch;
 * a seeded hash gives the same "random-looking" value every time for the
 * same index instead. */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Browsers store CSS numeric values as 32-bit floats internally, so an
 * inline style built from a full-precision JS double (e.g.
 * `101.50139935193866%`) gets silently truncated to ~6-7 significant figures
 * the moment the server HTML is parsed — and React's hydration check then
 * flags that truncated value against the untruncated one it computes fresh
 * on the client as a mismatch, even though nothing actually changed. Round
 * at the source so the string we author already matches what any browser
 * reflects back. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** One visual line of the (possibly wrapped) tagline, in the `<h1>`'s own
 * layout coordinates — where its hover filament sits and how wide it is. */
interface FilamentLine {
  left: number;
  top: number;
  width: number;
}

/** Groups the inline-block words into visual lines using `offset*` layout
 * values rather than `getBoundingClientRect()`: those ignore CSS
 * transforms, so neither the GSAP entrance, the idle float nor the cursor
 * tilt skews the measurement. Returns `null` when there's no real layout
 * yet (e.g. jsdom, or before the words mount). */
function measureFilamentLines(wordEls: Array<HTMLSpanElement | null>): FilamentLine[] | null {
  const lines: Array<FilamentLine & { rowTop: number }> = [];

  for (const el of wordEls) {
    if (!el) return null;
    const left = el.offsetLeft;
    const rowTop = el.offsetTop;
    let line = lines[lines.length - 1];
    if (!line || Math.abs(rowTop - line.rowTop) > 1) {
      line = { rowTop, left, top: rowTop + el.offsetHeight, width: 0 };
      lines.push(line);
    }
    line.width = left + el.offsetWidth - line.left;
  }

  if (lines.length === 0 || lines.every((line) => line.width <= 0)) return null;
  return lines.map(({ left, top, width }) => ({ left, top, width }));
}

function sameFilamentLines(a: FilamentLine[] | null, b: FilamentLine[] | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Particles scatter around the text block and converge toward a loose band
 * across its centre — not per-letter precision (which would need fragile
 * layout measurement that breaks on every reflow/breakpoint), but enough to
 * read as "data gathering into the words" before they resolve. */
function buildParticles(count: number): ParticleLayout[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = seededRandom(i * 3.1 + 1) * Math.PI * 2;
    const radius = 55 + seededRandom(i * 5.7 + 2) * 60;
    const size = 3 + seededRandom(i * 13.7 + 5) * 3;
    return {
      startXPercent: round(50 + Math.cos(angle) * radius),
      startYPercent: round(50 + Math.sin(angle) * radius * 0.6),
      endXPercent: round(12 + seededRandom(i * 7.9 + 3) * 76),
      endYPercent: round(30 + seededRandom(i * 11.3 + 4) * 40),
      size: round(size),
      glowBlur: round(size * 2.5),
      glowSpread: round(size * 0.8),
      hue: seededRandom(i * 17.1 + 6) > 0.55 ? "cyan" : "brand",
    };
  });
}

/**
 * Premium hero greeting: the words assemble from a loose field of converging
 * "data" particles (rather than a per-character typewriter/vertical
 * stagger), settle into crisp type, then catch a single light sweep — see
 * `.hero-title-sweep` in globals.css. After the entrance, a very subtle
 * cursor-driven 3D tilt (desktop only) and idle float keep the heading alive
 * without ever looking static, using the same damped-spring pattern the 3D
 * scenes use for pointer response. Entirely inert (immediate, fully
 * readable, no particles/tilt/float) when the user prefers reduced motion —
 * see `prefersReducedMotion` below — and independent of whether the shared
 * WebGL background is available at all, since this is pure DOM/CSS/GSAP.
 *
 * Hovering the words reveals a thin "light filament" under each visual line
 * (`.hero-filament` in globals.css) — pure CSS `:hover`, and the text itself
 * never changes. A plain `::after` on the heading can't follow wrapped
 * lines (it would span the whole column), so the one bit of JS measures
 * where each line's words sit — on resize/font load only, never per frame
 * or on hover — and renders one decorative filament per line.
 */
export function HeroGreeting({ text, id, className = "" }: HeroGreetingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const particleRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const tilt = useRef({ x: 0, y: 0 });
  const lastFrameTime = useRef<number | null>(null);
  const startTime = useRef<number | null>(null);
  const [filamentLines, setFilamentLines] = useState<FilamentLine[] | null>(null);

  const prefersReducedMotion = usePrefersReducedMotion();
  const { isCompact, isTablet, hasCoarsePointer } = useDeviceCapability();

  const words = useMemo(() => text.split(" "), [text]);
  // Reduced-motion users get no particles at all (rather than particles
  // rendered but never animated/hidden, which would otherwise leave them
  // permanently scattered on screen) — mobile drops them too as its own
  // "simplified 3D effects" tier, tablet gets fewer than desktop.
  const particleCount = prefersReducedMotion || isCompact ? 0 : isTablet ? 14 : 26;
  const particles = useMemo(() => buildParticles(particleCount), [particleCount]);

  useEffect(() => {
    const heading = headingRef.current;
    if (!heading || prefersReducedMotion) return;

    ensureGsapRegistered();

    const wordEls = wordRefs.current.filter((el): el is HTMLSpanElement => el !== null);
    const particleEls = particleRefs.current.filter((el): el is HTMLSpanElement => el !== null);

    const ctx = gsap.context(() => {
      gsap.set(heading, { autoAlpha: 1 });

      const tl = gsap.timeline({ delay: 0.2 });

      if (particleEls.length > 0) {
        tl.to(
          particleEls,
          {
            left: (i) => `${particles[i]?.endXPercent ?? 50}%`,
            top: (i) => `${particles[i]?.endYPercent ?? 50}%`,
            opacity: 0,
            scale: 0.3,
            duration: 0.9,
            stagger: 0.018,
            ease: "power2.in",
          },
          0
        );
      }

      tl.fromTo(
        wordEls,
        { autoAlpha: 0, y: 16, scale: 0.96, filter: "blur(10px)" },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          duration: 0.75,
          stagger: 0.085,
          ease: "power3.out",
        },
        particleEls.length > 0 ? 0.35 : 0
      );
    });

    return () => ctx.revert();
  }, [prefersReducedMotion, particles]);

  // Subtle cursor-driven tilt (desktop/fine-pointer only) plus a permanent
  // gentle idle float layered on top — never runs at all for reduced-motion
  // users, since `useJourneyFrame`'s loop itself never starts for them.
  useJourneyFrame((state) => {
    const heading = headingRef.current;
    if (!heading) return;

    const now = performance.now();
    if (startTime.current === null) startTime.current = now;
    const last = lastFrameTime.current ?? now;
    const delta = Math.min((now - last) / 1000, 0.1);
    lastFrameTime.current = now;
    const elapsed = (now - startTime.current) / 1000;

    const pointer = state.pointer;
    const targetTiltX = hasCoarsePointer ? 0 : pointer.y * -2.2;
    const targetTiltY = hasCoarsePointer ? 0 : pointer.x * 3;
    tilt.current.x = damp(tilt.current.x, targetTiltX, 4, delta);
    tilt.current.y = damp(tilt.current.y, targetTiltY, 4, delta);

    const floatAmplitude = isCompact ? 1.5 : isTablet ? 2.5 : 4;
    const floatY = Math.sin(elapsed * 0.55) * floatAmplitude;

    heading.style.transform = `perspective(1200px) rotateX(${tilt.current.x}deg) rotateY(${tilt.current.y}deg) translateY(${floatY}px)`;
  });

  // Re-measure the wrapped lines whenever the heading's width or any word's
  // size changes (breakpoints, font swap). ResizeObserver also fires once
  // on `observe()`, which covers the initial measurement.
  useEffect(() => {
    const heading = headingRef.current;
    if (!heading || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      const next = measureFilamentLines(wordRefs.current.slice(0, words.length));
      setFilamentLines((prev) => (sameFilamentLines(prev, next) ? prev : next));
    });
    observer.observe(heading);
    wordRefs.current.slice(0, words.length).forEach((el) => el && observer.observe(el));

    return () => observer.disconnect();
  }, [words]);

  const classes = [
    className,
    "relative",
    prefersReducedMotion ? "" : "motion-reveal hero-title-sweep",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={containerRef} className="tilt-perspective relative">
      {particles.map((particle, index) => (
        <span
          key={`hero-particle-${index}`}
          ref={(el) => {
            particleRefs.current[index] = el;
          }}
          aria-hidden="true"
          className={`hero-particle ${particle.hue === "cyan" ? "hero-particle-cyan" : "hero-particle-brand"}`}
          style={
            {
              left: `${particle.startXPercent}%`,
              top: `${particle.startYPercent}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              "--particle-blur": `${particle.glowBlur}px`,
              "--particle-spread": `${particle.glowSpread}px`,
            } as CSSProperties
          }
        />
      ))}
      <h1
        ref={headingRef}
        id={id}
        className={classes}
        style={{ willChange: "transform" }}
      >
        <span className="hero-filament">
          {/* A plain space between the inline-block words (not a non-breaking
              one inside them) collapses at each line end, so each filament
              stops at the last glyph instead of overhanging by a space. */}
          {words.map((word, index) => (
            <Fragment key={`${word}-${index}`}>
              <span className="inline-block" style={{ willChange: "transform, filter" }} ref={(el) => {
                wordRefs.current[index] = el;
              }}>
                {word}
              </span>
              {index < words.length - 1 ? " " : null}
            </Fragment>
          ))}
          {filamentLines?.map((line, index) => (
            <span
              key={`filament-line-${index}`}
              aria-hidden="true"
              className="hero-filament-line"
              style={
                {
                  left: `${line.left}px`,
                  top: `${line.top}px`,
                  width: `${line.width}px`,
                  "--line-index": index,
                } as CSSProperties
              }
            />
          ))}
        </span>
      </h1>
    </div>
  );
}
