"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { AmbientLight, PointLight } from "three";
import { sceneState } from "@/lib/motion/sceneState";

/**
 * Scroll-reactive lighting rig. Intensity and colour temperature are read
 * from the shared `sceneState` every frame (see lib/motion/sceneState.ts),
 * warming and cooling as the scroll-driven story moves between sections.
 */
export function Lighting() {
  const ambientRef = useRef<AmbientLight>(null);
  const keyLightRef = useRef<PointLight>(null);
  const rimLightRef = useRef<PointLight>(null);

  useFrame(() => {
    const { light, core } = sceneState;

    if (ambientRef.current) {
      ambientRef.current.intensity = light.ambient;
    }

    if (keyLightRef.current) {
      keyLightRef.current.intensity = light.point;
      keyLightRef.current.color.setRGB(core.color.r, core.color.g, core.color.b);
    }

    if (rimLightRef.current) {
      rimLightRef.current.intensity = light.point * 0.5;
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.6} />
      <pointLight ref={keyLightRef} position={[4, 3, 5]} intensity={1.2} />
      <pointLight ref={rimLightRef} position={[-5, -2, -4]} intensity={0.6} color="#4a7ba6" />
    </>
  );
}
