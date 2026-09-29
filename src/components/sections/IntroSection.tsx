"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";
import { ensureGsapRegistered, gsap } from "@/lib/motion/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import { useJourneyFrame } from "@/hooks/useJourneyFrame";
import { useWebglSupported } from "@/hooks/useWebglSupported";
import type { JourneyState } from "@/lib/motion/journeyState";
import { siteConfig } from "@/data/site";
import { heroPipelineNodes } from "@/data/journey";

/** How long each verb stays lit in the verb line (ms). */
const VERB_INTERVAL = 2400;

/** Tagline words set in the brand accent. */
const ACCENT_WORDS = new Set(["AI", "infused"]);

/** `useLayoutEffect` on the client (so the timeline's first frame lands
 * before paint), `useEffect` during SSR. */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** THINK → "think", for the fading verb line. */
const VERBS = heroPipelineNodes.map((node) => node.label.toLowerCase());

/** "a, b, c and d" — the verb line's static, screen-reader sentence. */
const VERB_SENTENCE = `${VERBS.slice(0, -1).join(", ")} and ${VERBS[VERBS.length - 1] ?? ""}`;

/** Cycles 0..count-1 every `interval` ms while `running`. */
function useCycle(count: number, interval: number, running: boolean) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!running || count < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => window.clearInterval(id);
  }, [count, interval, running]);
  return index;
}

/** The mark as a still image when the 3D scene isn't running (reduced
 * motion / no WebGL) — the Hero still leads with the brand. */
function HeroStaticMark() {
  const { enableScene } = useDeviceCapability();
  const webglSupported = useWebglSupported();
  if (enableScene && webglSupported) return null;
  return (
    <div aria-hidden="true" className="hero-static-mark pointer-events-none">
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative, already-optimised PNG */}
      <img src="/D3SG-logo.png" alt="" width={180} height={56} />
    </div>
  );
}

/**
 * Chapter 01 — the Hero. The living D3-SG mark (three/scenes/IntroScene.tsx:
 * the logo built from glowing particles, orbited by three light trails)
 * floats in a realistic deep-space plate (intro/HeroAtmosphere.tsx), right
 * of the copy on landscape screens and above it on portrait ones.
 *
 * The copy enters on one GSAP timeline: the eyebrow slides in, the tagline
 * rises word by word out of a mask (tilting up from blur), a rule draws
 * under it, then the verb line, description and actions follow in
 * sequence. After that a light sweep runs across the tagline every few
 * seconds, and the verb line cycles the five stages of how we build AI
 * (`heroPipelineNodes`: "…learns to think", "learn", "understand",
 * "predict", "create"), each verb crossfading into the next.
 *
 * Under reduced motion nothing cycles and everything is shown at rest. On
 * scroll the copy fades and drifts in lockstep with the scene's own
 * crossfade weight (see IntroSection.textSync.test.tsx).
 */
export function IntroSection() {
  const contentRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const verb = useCycle(VERBS.length, VERB_INTERVAL, !reducedMotion);

  // The entrance timeline, then the title's recurring light sweep.
  useIsomorphicLayoutEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    if (reducedMotion) {
      root.dataset.timeline = "done";
      return;
    }
    ensureGsapRegistered();
    const ctx = gsap.context(() => {
      const titleWords = gsap.utils.toArray<HTMLElement>(".hero-title-word", root);
      const steps = gsap.utils.toArray<HTMLElement>("[data-hero-step]", root);
      const intro = gsap.timeline({ delay: 0.25, defaults: { ease: "expo.out" } });
      intro
        .set(root, { attr: { "data-timeline": "running" } })
        .fromTo(
          '[data-hero-step="eyebrow"]',
          { opacity: 0, x: -18 },
          { opacity: 1, x: 0, duration: 0.7 }
        )
        .fromTo(
          titleWords,
          { opacity: 0, yPercent: 105, rotateX: -75, filter: "blur(12px)" },
          { opacity: 1, yPercent: 0, rotateX: 0, filter: "blur(0px)", duration: 1.15, stagger: 0.085 },
          "-=0.35"
        )
        .fromTo(".hero-title-rule", { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: "power3.inOut" }, "-=0.6")
        .fromTo(
          steps.filter((el) => el.dataset.heroStep !== "eyebrow"),
          { opacity: 0, y: 18, filter: "blur(6px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, stagger: 0.12, clearProps: "filter" },
          "-=0.8"
        )
        .set(root, { attr: { "data-timeline": "done" } });

      gsap
        .timeline({ delay: intro.duration() + 0.6, repeat: -1, repeatDelay: 5.5 })
        .fromTo(
          titleWords,
          { backgroundPosition: "100% 0%" },
          { backgroundPosition: "0% 0%", duration: 1.6, stagger: 0.07, ease: "sine.inOut" }
        );
    }, root);
    return () => ctx.revert();
  }, [reducedMotion]);

  const onFrame = useCallback((state: JourneyState) => {
    const local = state.progress.intro;
    const weight = state.weight.intro;
    const content = contentRef.current;
    const cue = cueRef.current;
    if (content) {
      content.style.opacity = String(weight);
      content.style.transform = `translate3d(0, ${local * -48}px, 0)`;
    }
    if (cue) {
      cue.style.opacity = String(Math.max(weight - local * 4, 0));
    }
  }, []);

  useJourneyFrame(onFrame);

  const words = siteConfig.tagline.split(" ");

  return (
    <Section
      stageId="intro"
      ariaLabelledBy="intro-heading"
      className="min-h-[75vh] md:min-h-[100vh] lg:min-h-[110vh]"
    >
      {/* Flows with the page at every size (no pin) — the chapter's 3D
          scene follows it via the scroll timeline's mid-screen reading
          point (lib/motion/scrollTimeline.ts). */}
      <div className="hero-stage relative flex h-auto items-center py-14 md:min-h-[100svh] md:py-0">
        <div
          aria-hidden="true"
          className="readability-scrim pointer-events-none absolute -inset-x-16 -inset-y-24 -z-10 blur-2xl"
        />
        <HeroStaticMark />
        <Container>
          <div ref={contentRef} data-timeline="pending" className="hero-copy flex max-w-[40rem] flex-col gap-5">
            <p data-hero-step="eyebrow" className="type-eyebrow flex items-center gap-3 text-brand-300">
              <span className="hero-live-dot" aria-hidden="true" />
              {siteConfig.name} · Singapore
            </p>

            <div>
              <h1 id="intro-heading" className="type-hero-greeting hero-title text-ink-50">
                {words.map((word, index) => (
                  <span key={`${word}-${index}`}>
                    <span className="hero-title-mask">
                      <span className="hero-title-word" data-accent={ACCENT_WORDS.has(word) ? "true" : undefined}>
                        {word}
                      </span>
                    </span>
                    {index < words.length - 1 ? " " : null}
                  </span>
                ))}
              </h1>
              <span aria-hidden="true" className="hero-title-rule" />
            </div>

            {/* The pipeline's five stages, fading one into the next. */}
            <p data-hero-step="verb" className="hero-verb-line">
              <span className="sr-only">Where your data learns to {VERB_SENTENCE}.</span>
              <span aria-hidden="true" className="hero-verb-sentence">
                Where your data learns to{" "}
                <span className="hero-verb-stack">
                  {VERBS.map((word, index) => (
                    <span key={word} className="hero-verb" data-active={index === verb ? "true" : "false"}>
                      {word}.
                    </span>
                  ))}
                </span>
              </span>
              <span aria-hidden="true" className="hero-verb-ticks">
                {VERBS.map((word, index) => (
                  <span key={word} className="hero-verb-tick" data-active={index === verb ? "true" : "false"} />
                ))}
              </span>
            </p>

            <p data-hero-step="description" className="max-w-xl type-body-lead text-ink-300">
              {siteConfig.description}
            </p>

            <div data-hero-step="actions" className="flex flex-wrap items-center gap-3 pt-1">
              <LinkButton href="#cta" variant="primary">
                Start a project
              </LinkButton>
              <LinkButton href="#about" variant="secondary" className="group/explore">
                Explore the journey
                <span aria-hidden="true" className="transition-transform duration-300 group-hover/explore:translate-x-0.5">
                  →
                </span>
              </LinkButton>
            </div>
          </div>
        </Container>

        <div
          ref={cueRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center gap-2 text-ink-400 md:bottom-10"
        >
          <span className="text-[0.65rem] font-medium uppercase tracking-[0.3em]">Scroll to enter the journey</span>
          <span className="h-9 w-5 rounded-full border border-ink-400/60 p-1">
            <span className="block h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400" />
          </span>
        </div>
      </div>
    </Section>
  );
}
