"use client";

import { useEffect } from "react";
import { ensureGsapRegistered, gsap, ScrollTrigger, SplitText } from "@/lib/motion/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Invisible controller for the homepage's scroll choreography. Sections stay
 * plain server-rendered markup and opt in through data attributes:
 *
 * - `data-split`      headline words slide up from a mask
 * - `data-reveal`     fade-up as it enters (adds `.is-in`, used by CSS)
 * - `data-highlight`  words light up as the reader scrolls through it
 * - `data-count`      number counts up when it enters
 * - `data-tilt`       card tilts + spotlight follows the pointer
 * - `data-magnetic`   button leans towards the pointer
 *
 * Plus the hero verb ticker, About phone tilt and Process step states.
 * Everything is created inside one `gsap.context` and reverted on unmount;
 * nothing runs under reduced motion (globals.css then shows final states).
 */
export function MotionDirector() {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    ensureGsapRegistered();

    let cancelled = false;
    const cleanups: Array<() => void> = [];
    let tickerCall: gsap.core.Tween | undefined;

    const ctx = gsap.context(() => {
      // Fade-up reveals, batched so neighbours stagger together.
      gsap.set("[data-reveal]", { y: 32 });
      ScrollTrigger.batch("[data-reveal]", {
        start: "top 90%",
        once: true,
        onEnter: (batch) => {
          batch.forEach((node) => node.classList.add("is-in"));
          gsap.to(batch, { y: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.09, delay: 0.1, clearProps: "transform" });
        },
      });

      // Hero verb ticker.
      const words = gsap.utils.toArray<HTMLElement>(".ticker span");
      if (words.length > 1) {
        gsap.set(words, { y: 0, yPercent: (i: number) => (i ? 120 : 0) });
        let current = 0;
        const next = () => {
          const out = words[current]!;
          current = (current + 1) % words.length;
          gsap.to(out, { yPercent: -120, duration: 0.7, ease: "expo.inOut" });
          gsap.fromTo(words[current]!, { yPercent: 120 }, { yPercent: 0, duration: 0.7, ease: "expo.inOut" });
          tickerCall = gsap.delayedCall(2.4, next);
        };
        tickerCall = gsap.delayedCall(2.4, next);
      }

      // Counters.
      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((node) => {
        const end = Number(node.dataset.count);
        const value = { v: 0 };
        gsap.to(value, {
          v: end,
          duration: 2,
          ease: "expo.out",
          scrollTrigger: { trigger: node, start: "top 92%", once: true },
          onUpdate: () => { node.textContent = String(Math.round(value.v)); },
        });
      });

      // About: the phone drifts and tilts as the section scrolls past.
      if (document.querySelector(".phone")) {
        gsap.fromTo(".phone", { rotate: -5, y: 50 }, { rotate: 3, y: -40, ease: "none", scrollTrigger: { trigger: "#about", start: "top bottom", end: "bottom top", scrub: true } });
      }

      // Process: one active step at a time, progress rail, live counters.
      gsap.utils.toArray<HTMLElement>(".step").forEach((step) => {
        ScrollTrigger.create({ trigger: step, start: "top 65%", end: "bottom 45%", toggleClass: "is-active" });
      });
      if (document.querySelector(".rail i")) {
        gsap.to(".rail i", { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".steps", start: "top 65%", end: "bottom 55%", scrub: true } });
      }
      const tests = document.querySelector<HTMLElement>("[data-tests]");
      if (tests) {
        const total = Number(tests.dataset.tests);
        ScrollTrigger.create({
          trigger: tests.closest(".step") ?? tests,
          start: "top 65%",
          end: "bottom 45%",
          onToggle: (self) => {
            if (!self.isActive) return;
            const run = { n: 0 };
            gsap.to(run, { n: total, duration: 1.6, ease: "power2.out", onUpdate: () => { tests.textContent = String(Math.round(run.n)); } });
          },
        });
      }
      const ms = document.querySelector<HTMLElement>("[data-ms]");
      if (ms) {
        let timer: ReturnType<typeof setInterval> | undefined;
        ScrollTrigger.create({
          trigger: ms.closest(".step") ?? ms,
          start: "top 65%",
          end: "bottom 45%",
          onToggle: (self) => {
            clearInterval(timer);
            if (self.isActive) timer = setInterval(() => { ms.textContent = String(160 + Math.round(Math.random() * 45)); }, 1200);
          },
        });
        cleanups.push(() => clearInterval(timer));
      }
    });

    // Text splitting waits for webfonts so line breaks are measured correctly.
    document.fonts?.ready.then(() => {
      if (cancelled) return;
      ctx.add(() => {
        gsap.utils.toArray<HTMLElement>("[data-split]").forEach((heading) => {
          const split = SplitText.create(heading, { type: "lines,words", mask: "lines", linesClass: "line" });
          gsap.set(heading, { opacity: 1 });
          const vars = { yPercent: 115, duration: 1.15, ease: "expo.out", stagger: 0.045 };
          if (heading.closest("#hero")) gsap.from(split.words, { ...vars, delay: 0.15 });
          else gsap.from(split.words, { ...vars, scrollTrigger: { trigger: heading, start: "top 85%", once: true } });
        });
        const statement = document.querySelector<HTMLElement>("[data-highlight]");
        if (statement) {
          const split = SplitText.create(statement, { type: "words" });
          gsap.fromTo(split.words, { opacity: 0.15 }, { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: statement, start: "top 80%", end: "bottom 45%", scrub: true } });
        }
        ScrollTrigger.refresh();
      });
    });

    // Pointer-only flourishes.
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((tile) => {
        const move = (event: PointerEvent) => {
          const rect = tile.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width;
          const y = (event.clientY - rect.top) / rect.height;
          tile.style.setProperty("--sx", `${x * 100}%`);
          tile.style.setProperty("--sy", `${y * 100}%`);
          tile.style.setProperty("--rx", `${((0.5 - y) * 4).toFixed(2)}deg`);
          tile.style.setProperty("--ry", `${((x - 0.5) * 5).toFixed(2)}deg`);
        };
        const leave = () => {
          tile.style.setProperty("--rx", "0deg");
          tile.style.setProperty("--ry", "0deg");
        };
        tile.addEventListener("pointermove", move);
        tile.addEventListener("pointerleave", leave);
        cleanups.push(() => {
          tile.removeEventListener("pointermove", move);
          tile.removeEventListener("pointerleave", leave);
        });
      });
      document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((button) => {
        const move = (event: PointerEvent) => {
          const rect = button.getBoundingClientRect();
          gsap.to(button, {
            x: (event.clientX - rect.left - rect.width / 2) * 0.25,
            y: (event.clientY - rect.top - rect.height / 2) * 0.35,
            duration: 0.4,
            ease: "power3.out",
          });
        };
        const leave = () => gsap.to(button, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.4)" });
        button.addEventListener("pointermove", move);
        button.addEventListener("pointerleave", leave);
        cleanups.push(() => {
          button.removeEventListener("pointermove", move);
          button.removeEventListener("pointerleave", leave);
          gsap.set(button, { clearProps: "transform" });
        });
      });
    }

    return () => {
      cancelled = true;
      tickerCall?.kill();
      cleanups.forEach((cleanup) => cleanup());
      ctx.revert();
    };
  }, [reducedMotion]);

  return null;
}
