"use client";

import { useEffect, useRef } from "react";
import { ensureGsapRegistered, gsap } from "@/lib/motion/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Shared plumbing for the homepage's animated product demos.
 *
 * Each demo renders its *finished* state as normal markup (what reduced-
 * motion visitors, crawlers and no-JS users see) and only takes over the DOM
 * imperatively once it is on screen, via a GSAP timeline that is rebuilt
 * every cycle so layout-dependent positions stay correct after resizes.
 * Demos never re-render through React after mount, so these direct DOM
 * writes cannot be clobbered by reconciliation.
 */

export interface DemoControls {
  start(): void;
  stop(): void;
  /** One-off setup before the first start (e.g. draw initial data). */
  init?(): void;
  /** Called instead of animating when the visitor prefers reduced motion. */
  renderStatic?(): void;
}

export type DemoFactory<T extends HTMLElement> = (root: T) => DemoControls;

export function useDemo<T extends HTMLElement>(factory: DemoFactory<T>) {
  const ref = useRef<T>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (reducedMotion) {
      factory(root).renderStatic?.();
      return;
    }
    if (typeof IntersectionObserver === "undefined") return;

    ensureGsapRegistered();
    const demo = factory(root);
    demo.init?.();
    const observer = new IntersectionObserver(
      ([entry]) => (entry?.isIntersecting ? demo.start() : demo.stop()),
      { threshold: 0.4 }
    );
    observer.observe(root);

    return () => {
      observer.disconnect();
      demo.stop();
      root.querySelectorAll(".fcursor").forEach((node) => node.remove());
    };
  }, [factory, reducedMotion]);

  return ref;
}

/**
 * Wraps a timeline builder in start/stop controls. The builder runs again
 * each time the previous cycle completes; `maxCycles` lets a demo play a few
 * times and then rest on its finished frame instead of looping forever.
 */
export function loop(build: () => gsap.core.Timeline, firstDelay = 0, maxCycles = Infinity): Pick<DemoControls, "start" | "stop"> {
  let timeline: gsap.core.Timeline | undefined;
  let delayed: gsap.core.Tween | undefined;
  let first = true;
  let cycles = 0;

  const stop = () => {
    timeline?.kill();
    delayed?.kill();
  };

  return {
    start() {
      stop();
      if (cycles >= maxCycles) return;
      const run = () => {
        if (cycles >= maxCycles) return;
        cycles += 1;
        timeline = build();
        timeline.eventCallback("onComplete", run);
      };
      delayed = gsap.delayedCall(first ? firstDelay : 0.2, run);
      first = false;
    },
    stop,
  };
}

/** Pause inside a timeline. */
export function hold(timeline: gsap.core.Timeline, seconds: number) {
  return timeline.to({}, { duration: seconds });
}

/**
 * Position of `node` inside `root` from layout offsets (unaffected by the
 * tile tilt / reveal transforms applied to ancestors).
 */
export function relPos(node: HTMLElement, root: HTMLElement, center = true) {
  let x = 0;
  let y = 0;
  let current: HTMLElement | null = node;
  while (current && current !== root) {
    x += current.offsetLeft;
    y += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }
  return center ? { x: x + node.offsetWidth / 2, y: y + node.offsetHeight / 2 } : { x, y };
}

/** A fake mouse pointer for "someone is using the product" demos. */
export function fakeCursor(root: HTMLElement) {
  const cursor = document.createElement("div");
  cursor.className = "fcursor";
  cursor.setAttribute("aria-hidden", "true");
  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");
  svg.setAttribute("viewBox", "0 0 20 20");
  const path = document.createElementNS(svgNs, "path");
  path.setAttribute("d", "M3 2l13 7-6 1.5L7.5 17z");
  svg.append(path);
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  cursor.append(svg, ripple);
  root.append(cursor);
  gsap.set(cursor, { x: root.offsetWidth * 0.85, y: root.offsetHeight * 0.85, transformOrigin: "0 0" });
  return cursor;
}

export function click(timeline: gsap.core.Timeline, cursor: HTMLElement) {
  return timeline
    .to(cursor, { scale: 0.82, duration: 0.09 })
    .to(cursor, { scale: 1, duration: 0.2 })
    .fromTo(cursor.querySelector(".ripple"), { scale: 0, opacity: 0.7 }, { scale: 2.6, opacity: 0, duration: 0.5 }, "<-0.1");
}

export const money = (millions: number) => `$${millions.toFixed(2)}M`;
