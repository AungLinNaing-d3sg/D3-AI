"use client";

import { Canvas } from "@react-three/fiber";
import { Lighting } from "@/components/three/Lighting";
import { CoreObject } from "@/components/three/CoreObject";
import { ParticleField } from "@/components/three/ParticleField";
import { NodeNetwork } from "@/components/three/NodeNetwork";
import { CameraRig } from "@/components/three/CameraRig";

interface ExperienceProps {
  quality: "high" | "low";
  enableParallax: boolean;
}

/**
 * The full R3F scene tree. Deliberately contains no DOM/UI — this is the
 * "3D scene" half of the "combine traditional HTML/UI with interactive 3D
 * scenes" requirement; all real content lives in `components/sections`.
 */
export function Experience({ quality, enableParallax }: ExperienceProps) {
  const particleCount = quality === "high" ? 1400 : 500;
  const dpr: [number, number] = quality === "high" ? [1, 2] : [1, 1.25];

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.4, 7], fov: 45, near: 0.1, far: 30 }}
      eventSource={typeof document !== "undefined" ? document.body : undefined}
      eventPrefix="client"
    >
      <color attach="background" args={["#05070d"]} />
      <fog attach="fog" args={["#05070d", 6, 16]} />
      <Lighting />
      <CoreObject />
      <ParticleField count={particleCount} />
      <NodeNetwork />
      <CameraRig enableParallax={enableParallax} />
    </Canvas>
  );
}

export default Experience;
