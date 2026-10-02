"use client";

import { useEffect, useRef } from "react";
import { ensureGsapRegistered, gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/** Where each blob rests, as fractions of the viewport. */
const HOMES: ReadonlyArray<readonly [number, number]> = [
  [0.68, 0.22],
  [0.9, 0.62],
  [0.12, 0.85],
];

/**
 * Fixed, decorative backdrop: three soft brand-colour blobs that drift and
 * lean towards the pointer, a faint dot grid, and a red "spotlight" of dots
 * around the cursor. Calms down (fades towards the page colour) once the
 * reader scrolls past the hero. Static under reduced motion.
 */
export function SiteBackground() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion) return;
    ensureGsapRegistered();

    const blobs = Array.from(root.querySelectorAll<HTMLElement>(".blob"));
    // Hero demo cards share the same smoothed pointer for their parallax.
    const floats = Array.from(document.querySelectorAll<HTMLElement>(".float[data-depth]"));
    let mx = window.innerWidth * 0.65;
    let my = window.innerHeight * 0.35;
    let px = mx;
    let py = my;
    const onPointer = (event: PointerEvent) => {
      mx = event.clientX;
      my = event.clientY;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const tick = (time: number) => {
      px += (mx - px) * 0.06;
      py += (my - py) * 0.06;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const nx = px / w - 0.5;
      const ny = py / h - 0.5;
      blobs.forEach((blob, i) => {
        const [hx, hy] = HOMES[i] ?? [0.5, 0.5];
        const size = blob.offsetWidth;
        const x = hx * w + Math.sin(time * (0.18 + i * 0.07) + i * 2) * w * 0.08 + nx * (60 + i * 50) - size / 2;
        const y = hy * h + Math.cos(time * (0.15 + i * 0.05) + i) * h * 0.08 + ny * (60 + i * 50) - size / 2;
        blob.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
      root.style.setProperty("--mx", `${px}px`);
      root.style.setProperty("--my", `${py}px`);
      floats.forEach((card) => {
        const depth = Number(card.dataset.depth);
        card.style.transform = `translate3d(${nx * -depth * 18}px, ${ny * -depth * 18}px, 0)`;
      });
    };
    gsap.ticker.add(tick);

    const fade = gsap.to(root, {
      "--fade": 0.75,
      ease: "none",
      scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true },
    });

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onPointer);
      fade.scrollTrigger?.kill();
      fade.kill();
      ScrollTrigger.refresh();
    };
  }, [reducedMotion]);

  return (
    <div ref={rootRef} className="bg" aria-hidden="true">
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
      <div className="dots" />
      <div className="dots-spot" />
      <div className="bg-fade" />
    </div>
  );
}
