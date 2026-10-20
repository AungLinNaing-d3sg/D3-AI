"use client";

import { useEffect, useRef } from "react";
import { ensureGsapRegistered, gsap, ScrollTrigger, SplitText } from "@/lib/motion/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { lenisInstance } from "@/lib/motion/lenisInstance";

/**
 * Right-to-left scroll travel, ported from the light redesign's Services
 * section (development_v2). On ≥1024px the stage is sized to the track's
 * overflow, its inner viewport is sticky (CSS, so the depth-exit transforms
 * elsewhere can't break it), and scrolling translates the track left. Each
 * `[data-track-title]` reveals from a mask as its panel slides in, followed
 * by the panel's `[data-track-copy]` blocks (summary, list, live demo).
 * Smaller screens keep the normal stacked layout with vertical reveals.
 * Fine pointers also get v2's panel interaction: a gentle tilt towards the
 * cursor with a spotlight that follows it (`[data-panel-tilt]`).
 *
 * While tracking, the panels also turn in from depth as they travel (a
 * coverflow-like `--enter` / `--enter-abs`, 0 when centred), and the track
 * controls (`[data-track-controls]`) follow along: the current panel's
 * number and name, a progress bar (`--track-progress` on the stage) and
 * previous / next buttons that scroll the page to that panel.
 */
export function useHorizontalTrack() {
  const stageRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const stage = stageRef.current;
    const track = stage?.querySelector<HTMLElement>("[data-track]");
    if (!stage || !track || reducedMotion) return;
    ensureGsapRegistered();

    const titles = Array.from(track.querySelectorAll<HTMLElement>("[data-track-title]"));
    const panels = Array.from(track.querySelectorAll<HTMLElement>("[data-panel-tilt]"));
    const copyOf = (panel: HTMLElement) => Array.from(panel.querySelectorAll<HTMLElement>("[data-track-copy]"));
    const cleanups: Array<() => void> = [];
    const revealCopy = (panel: HTMLElement, scrollTrigger: ScrollTrigger.Vars) =>
      gsap.from(copyOf(panel), { y: 34, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.12, delay: 0.15, scrollTrigger });
    const splits = titles.map((el) => SplitText.create(el, { type: "lines", mask: "lines", linesClass: "reveal-line" }));

    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      // Travel until the last panel's right edge meets the gutter.
      const distance = () => {
        const last = track.lastElementChild as HTMLElement | null;
        if (!last) return 0;
        const gutter = parseFloat(getComputedStyle(track).paddingLeft) || 0;
        return Math.max(0, last.offsetLeft + last.offsetWidth + gutter - window.innerWidth);
      };
      const size = () => {
        stage.style.height = `${window.innerHeight + distance()}px`;
      };
      size();
      stage.classList.add("is-tracking");
      ScrollTrigger.addEventListener("refreshInit", size);

      // Track controls + depth, kept in step with the travel.
      const count = stage.querySelector<HTMLElement>("[data-track-count]");
      const name = stage.querySelector<HTMLElement>("[data-track-name]");
      const prev = stage.querySelector<HTMLButtonElement>("[data-track-prev]");
      const next = stage.querySelector<HTMLButtonElement>("[data-track-next]");
      const last = Math.max(panels.length - 1, 1);
      let current = -1;
      const update = (progress: number) => {
        stage.style.setProperty("--track-progress", progress.toFixed(4));
        const index = Math.round(progress * last);
        if (index !== current) {
          current = index;
          if (count) count.textContent = String(index + 1).padStart(2, "0");
          if (name) name.textContent = panels[index]?.dataset.trackLabel ?? "";
          if (prev) prev.disabled = index <= 0;
          if (next) next.disabled = index >= panels.length - 1;
        }
        const centre = window.innerWidth / 2;
        panels.forEach((panel) => {
          const r = panel.getBoundingClientRect();
          const enter = Math.max(-1, Math.min(1, (r.left + r.width / 2 - centre) / window.innerWidth));
          panel.style.setProperty("--enter", enter.toFixed(3));
          panel.style.setProperty("--enter-abs", Math.abs(enter).toFixed(3));
        });
      };
      const goTo = (index: number) => {
        const clamped = Math.max(0, Math.min(panels.length - 1, index));
        const top = stage.getBoundingClientRect().top + window.scrollY;
        const target = top + (clamped / last) * (stage.offsetHeight - window.innerHeight) + 1;
        const lenis = lenisInstance.current;
        if (lenis) lenis.scrollTo(target, { duration: 1.1 });
        else window.scrollTo({ top: target, behavior: "smooth" });
      };
      const onPrev = () => goTo(current - 1);
      const onNext = () => goTo(current + 1);
      prev?.addEventListener("click", onPrev);
      next?.addEventListener("click", onNext);

      const travel = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: stage,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => update(self.progress),
          onRefresh: (self) => update(self.progress),
        },
      });
      splits.forEach((split, i) => {
        // The first panel is on screen before the travel starts.
        const scrollTrigger = i === 0
          ? { trigger: titles[0]!, start: "top 85%", once: true }
          : { trigger: titles[i]!, containerAnimation: travel, start: "left 85%", once: true };
        gsap.from(split.lines, { yPercent: 110, duration: 1, ease: "expo.out", stagger: 0.08, scrollTrigger });
        if (panels[i]) revealCopy(panels[i]!, scrollTrigger);
      });
      return () => {
        ScrollTrigger.removeEventListener("refreshInit", size);
        prev?.removeEventListener("click", onPrev);
        next?.removeEventListener("click", onNext);
        stage.classList.remove("is-tracking");
        stage.style.height = "";
        stage.style.removeProperty("--track-progress");
        panels.forEach((panel) => {
          panel.style.removeProperty("--enter");
          panel.style.removeProperty("--enter-abs");
        });
      };
    });
    mm.add("(max-width: 1023px)", () => {
      splits.forEach((split, i) => {
        const scrollTrigger = { trigger: titles[i]!, start: "top 85%", once: true };
        gsap.from(split.lines, { yPercent: 110, duration: 1, ease: "expo.out", stagger: 0.08, scrollTrigger });
        if (panels[i]) revealCopy(panels[i]!, scrollTrigger);
      });
    });

    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      panels.forEach((panel) => {
        const move = (event: PointerEvent) => {
          const r = panel.getBoundingClientRect();
          const x = (event.clientX - r.left) / r.width;
          const y = (event.clientY - r.top) / r.height;
          panel.style.setProperty("--tilt-x", `${((0.5 - y) * 4).toFixed(2)}deg`);
          panel.style.setProperty("--tilt-y", `${((x - 0.5) * 5).toFixed(2)}deg`);
          panel.style.setProperty("--sx", `${(x * 100).toFixed(1)}%`);
          panel.style.setProperty("--sy", `${(y * 100).toFixed(1)}%`);
        };
        const leave = () => {
          panel.style.setProperty("--tilt-x", "0deg");
          panel.style.setProperty("--tilt-y", "0deg");
        };
        panel.addEventListener("pointermove", move);
        panel.addEventListener("pointerleave", leave);
        cleanups.push(() => {
          panel.removeEventListener("pointermove", move);
          panel.removeEventListener("pointerleave", leave);
        });
      });
    }
    ScrollTrigger.refresh();

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      mm.revert();
      splits.forEach((split) => split.revert());
    };
  }, [reducedMotion]);

  return stageRef;
}
