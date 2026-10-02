"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { canvas2dSupported, displayFontReady } from "@/lib/particles/particleWordmark";
import { ParticleScene } from "@/lib/particles/particleScene";

/** Each gap is marked by the top edge of the section that follows it. */
const GAP_SECTIONS = ["services", "process", "team", "faq", "contact"];

/**
 * Fixed full-viewport particle layer (see lib/particles/particleScene.ts):
 * the D3SG logo behind the hero title, then a slowly rotating geometric
 * shape in each gap between sections, and nothing inside the sections.
 * Reduced motion: shapes and logo appear in place without moving.
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
      const scene = new ParticleScene(canvas, {
        gapSections: GAP_SECTIONS,
        maxParticles: compact ? 1100 : 2600,
        dotSize: compact ? 1.8 : 2.2,
        repelRadius: compact ? 0 : 110,
        heroLayout: (w, h) => {
          const bw = Math.min(w * (compact ? 0.94 : 0.9), 1240);
          const bh = bw * 0.34;
          return { x: (w - bw) / 2, y: h * 0.47 - bh / 2, w: bw, h: bh };
        },
      });
      scene.resize();
      const onResize = () => {
        scene.resize();
        if (reducedMotion) scene.drawStatic();
      };
      window.addEventListener("resize", onResize);
      cleanups.push(() => window.removeEventListener("resize", onResize));

      if (reducedMotion) {
        const draw = () => scene.drawStatic();
        draw();
        window.addEventListener("scroll", draw, { passive: true });
        cleanups.push(() => window.removeEventListener("scroll", draw));
        return;
      }

      const onPointer = (event: PointerEvent) => scene.setPointer(event.clientX, event.clientY);
      const onLeave = () => scene.setPointer(-9999, -9999);
      const onVisibility = () => (document.hidden ? scene.stop() : scene.start());
      window.addEventListener("pointermove", onPointer, { passive: true });
      document.addEventListener("pointerleave", onLeave);
      document.addEventListener("visibilitychange", onVisibility);
      scene.start();
      cleanups.push(() => {
        scene.stop();
        window.removeEventListener("pointermove", onPointer);
        document.removeEventListener("pointerleave", onLeave);
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
