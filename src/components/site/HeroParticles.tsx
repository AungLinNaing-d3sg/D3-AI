"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { canvas2dSupported, displayFontReady, ParticleWordmark } from "@/lib/particles/particleWordmark";

/**
 * Fixed full-viewport particle layer. On load the dots fly in and assemble
 * into a large "D3SG" behind the hero title; scrolling past the hero breaks
 * it apart into the faint drifting field that sits behind every later
 * section (the frosted cards blur it). Dots push away from the pointer.
 * Reduced motion: drawn once, assembled in the hero and dispersed after it.
 */
export function HeroParticles() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !canvas2dSupported()) return;
    let disposed = false;
    const cleanups: Array<() => void> = [];

    displayFontReady().then(() => {
      if (disposed) return;
      const compact = window.innerWidth < 768;
      const engine = new ParticleWordmark(canvas, {
        text: "D3SG",
        accentChars: 1,
        base: "#0d0e11",
        accent: "#e5412d",
        alpha: [0.2, 0.16],
        layout: (w, h) => {
          const bw = Math.min(w * (compact ? 0.94 : 0.9), 1240);
          const bh = bw * 0.34;
          return { x: (w - bw) / 2, y: h * 0.47 - bh / 2, w: bw, h: bh };
        },
        maxParticles: compact ? 1100 : 2600,
        dotSize: compact ? 1.8 : 2.1,
        repelRadius: compact ? 0 : 110,
      });
      engine.resize();

      const scrollScatter = () => Math.min(Math.max(window.scrollY / (window.innerHeight * 0.75), 0), 1);

      if (reducedMotion) {
        const draw = () => engine.drawStatic(scrollScatter() > 0.5 ? 1 : 0);
        draw();
        window.addEventListener("scroll", draw, { passive: true });
        cleanups.push(() => window.removeEventListener("scroll", draw));
        return;
      }

      // Fly in from the dispersed field, then hand over to scroll.
      let intro = 1;
      engine.scatter = 1;
      const introStart = performance.now();
      const tick = () => {
        const k = Math.min((performance.now() - introStart) / 1800, 1);
        intro = 1 - (1 - Math.pow(1 - k, 3));
        engine.scatter = Math.max(intro, scrollScatter());
        if (!disposed) raf = requestAnimationFrame(tick);
      };
      let raf = requestAnimationFrame(tick);

      const onPointer = (event: PointerEvent) => engine.setPointer(event.clientX, event.clientY);
      const onLeave = () => engine.setPointer(-9999, -9999);
      const onResize = () => engine.resize();
      const onVisibility = () => (document.hidden ? engine.stop() : engine.start());
      window.addEventListener("pointermove", onPointer, { passive: true });
      document.addEventListener("pointerleave", onLeave);
      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", onVisibility);
      engine.start();
      cleanups.push(() => {
        cancelAnimationFrame(raf);
        engine.stop();
        window.removeEventListener("pointermove", onPointer);
        document.removeEventListener("pointerleave", onLeave);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVisibility);
      });
    });

    return () => {
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [reducedMotion]);

  return <canvas ref={ref} className="particles" aria-hidden="true" />;
}
