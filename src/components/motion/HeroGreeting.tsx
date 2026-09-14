"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
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
 */
export function HeroGreeting({ text, id, className = "" }: HeroGreetingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const particleRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const tilt = useRef({ x: 0, y: 0 });
  const lastFrameTime = useRef<number | null>(null);
  const startTime = useRef<number | null>(null);

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

  const classes = [className, prefersReducedMotion ? "" : "motion-reveal hero-title-sweep"]
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
      <h1 ref={headingRef} id={id} className={classes} style={{ willChange: "transform" }}>
        {words.map((word, index) => (
          <span key={`${word}-${index}`} className="inline-block" style={{ willChange: "transform, filter" }} ref={(el) => {
            wordRefs.current[index] = el;
          }}>
            {word}
            {index < words.length - 1 ? " " : ""}
          </span>
        ))}
      </h1>
    </div>
  );
}
