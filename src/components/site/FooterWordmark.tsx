"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { canvas2dSupported, displayFontReady, ParticleWordmark } from "@/lib/particles/particleWordmark";

/**
 * The footer's "D3SG", built from particles: they gather into the wordmark
 * when the footer scrolls into view and ripple away from the pointer. Only
 * animates while visible. The real text stays in the DOM for assistive tech.
 */
export function FooterWordmark() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || !canvas2dSupported()) return;
    let disposed = false;
    const cleanups: Array<() => void> = [];

    displayFontReady().then(() => {
      if (disposed) return;
      const compact = window.innerWidth < 768;
      const engine = new ParticleWordmark(canvas, {
        text: "D3SG",
        accentChars: 1,
        base: "#f2f3f5",
        accent: "#ff5a43",
        alpha: [0.95, 0.25],
        layout: (w, h) => ({ x: 0, y: 0, w, h }),
        maxParticles: compact ? 1400 : 4200,
        dotSize: compact ? 2 : 2.4,
        repelRadius: compact ? 0 : 90,
      });
      engine.resize();

      if (reducedMotion) {
        engine.drawStatic(0);
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            engine.start();
            engine.animateScatter(0, 1800);
          } else {
            engine.stop();
            engine.scatter = 1;
          }
        },
        { threshold: 0.25 }
      );
      observer.observe(wrap);

      const onPointer = (event: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        engine.setPointer(event.clientX - rect.left, event.clientY - rect.top);
      };
      const onLeave = () => engine.setPointer(-9999, -9999);
      const onResize = () => engine.resize();
      wrap.addEventListener("pointermove", onPointer);
      wrap.addEventListener("pointerleave", onLeave);
      window.addEventListener("resize", onResize);
      cleanups.push(() => {
        observer.disconnect();
        engine.stop();
        wrap.removeEventListener("pointermove", onPointer);
        wrap.removeEventListener("pointerleave", onLeave);
        window.removeEventListener("resize", onResize);
      });
    });

    return () => {
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [reducedMotion]);

  return (
    <div ref={wrapRef} className="foot-wordmark">
      <canvas ref={canvasRef} aria-hidden="true" />
      <span className="sr-only">D3-SG</span>
    </div>
  );
}
