"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type AmbientLight, type PointLight } from "three";
import { journeyState } from "@/lib/motion/journeyState";
import { damp } from "@/lib/motion/mathUtils";

const keyColor = new Color();

/**
 * Single scroll-reactive lighting rig shared by every scene. Colour
 * temperature and intensity are read from `journeyState.light` every frame
 * (see lib/motion/scrollTimeline.ts), continuously warming/cooling as the
 * journey moves — a cool blue intro, warming through the typography/product
 * chapters, cooling into the neural/data chapters, and settling on the
 * brand colour for the final CTA.
 */
export function Lighting() {
  const ambientRef = useRef<AmbientLight>(null);
  const keyLightRef = useRef<PointLight>(null);
  const rimLightRef = useRef<PointLight>(null);

  useFrame((_, delta) => {
    const { light } = journeyState;
    keyColor.set(light.colorHex);

    if (ambientRef.current) {
      ambientRef.current.intensity = damp(ambientRef.current.intensity, light.ambient, 4, delta);
    }
    if (keyLightRef.current) {
      keyLightRef.current.intensity = damp(keyLightRef.current.intensity, light.key, 4, delta);
      keyLightRef.current.color.lerp(keyColor, 0.06);
    }
    if (rimLightRef.current) {
      rimLightRef.current.intensity = damp(rimLightRef.current.intensity, light.rim, 4, delta);
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.5} />
      <pointLight ref={keyLightRef} position={[4, 3, 5]} intensity={1.2} />
      <pointLight ref={rimLightRef} position={[-5, -2, -4]} intensity={0.5} color="#4a7ba6" />
    </>
  );
}
