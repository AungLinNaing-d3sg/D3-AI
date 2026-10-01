"use client";

import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { CtaScene } from "@/components/three/scenes/CtaScene";
import type { SceneQuality } from "@/lib/three/deviceTiers";

interface CtaStillCanvasProps {
  quality: SceneQuality;
}

/** On desktop the anchor holds the core in frame while the section scrolls
 * (see CtaStage's `useCtaStory`), so the still frame is redrawn — once per
 * scroll event, never on a loop — to follow it. */
function RedrawOnScroll() {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    const redraw = () => invalidate();
    window.addEventListener("scroll", redraw, { passive: true });
    return () => window.removeEventListener("scroll", redraw);
  }, [invalidate]);
  return null;
}

/**
 * Reduced-motion presentation of Chapter 08: the intelligence core in its
 * settled state, with its plinth, lighting, supporting structures and studio
 * environment, in a canvas of its own covering the section (the shared,
 * full-page canvas is skipped site-wide for reduced motion — see
 * SceneCanvas). `frameloop="demand"` means it only redraws when something
 * actually changes (a resize, or the held anchor moving on scroll) — there
 * is no animation loop at all, and nothing in the frame moves.
 */
export default function CtaStillCanvas({ quality }: CtaStillCanvasProps) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [-0.3, 0.2, 4.9], fov: 36, near: 0.1, far: 30 }}
      className="!absolute inset-0"
    >
      <CtaScene quality={quality === "high" ? "medium" : quality} still />
      <RedrawOnScroll />
    </Canvas>
  );
}
