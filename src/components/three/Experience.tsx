"use client";

import { Canvas } from "@react-three/fiber";
import { Lighting } from "@/components/three/Lighting";
import { CameraRig } from "@/components/three/CameraRig";
import { IntroScene } from "@/components/three/scenes/IntroScene";
import { TypographyScene } from "@/components/three/scenes/TypographyScene";
import { NeuralScene } from "@/components/three/scenes/NeuralScene";
import { UniverseScene } from "@/components/three/scenes/UniverseScene";
import { ProductScene } from "@/components/three/scenes/ProductScene";
import { GameAmbienceScene } from "@/components/three/scenes/GameAmbienceScene";
import { FutureScene } from "@/components/three/scenes/FutureScene";
import { CtaScene } from "@/components/three/scenes/CtaScene";

interface ExperienceProps {
  quality: "high" | "low";
  enableParallax: boolean;
}

/**
 * The full R3F scene tree — one continuous `<Canvas>` shared by all 8
 * chapters. Deliberately contains no interactive UI/forms (the "3D scene"
 * half of "combine traditional HTML/UI with interactive 3D scenes"); all
 * real content, navigation, and controls live in `components/sections`.
 *
 * Each chapter below is its own scene component with its own visual
 * language (typography particles, neural graph, particle universe, floating
 * product UI, cinematic monoliths, minimal CTA glow) — deliberately *not*
 * one object re-skinned 8 times. All 7 always mount so their crossfade
 * (`journeyState.weight`) can overlap smoothly at chapter boundaries; each
 * scene is responsible for going idle (skipping expensive per-frame work)
 * once its own weight reaches zero.
 */
export function Experience({ quality, enableParallax }: ExperienceProps) {
  const dpr: [number, number] = quality === "high" ? [1, 2] : [1, 1.25];

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.5, 9.5], fov: 42, near: 0.1, far: 40 }}
      eventSource={typeof document !== "undefined" ? document.body : undefined}
      eventPrefix="client"
    >
      <color attach="background" args={["#05070d"]} />
      <Lighting />

      <IntroScene quality={quality} />
      <TypographyScene quality={quality} />
      <NeuralScene quality={quality} />
      <UniverseScene quality={quality} />
      <ProductScene quality={quality} />
      <GameAmbienceScene quality={quality} />
      <FutureScene quality={quality} />
      <CtaScene quality={quality} />

      <CameraRig enableParallax={enableParallax} />
    </Canvas>
  );
}

export default Experience;
