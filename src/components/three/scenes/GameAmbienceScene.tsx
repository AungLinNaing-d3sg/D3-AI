"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type BufferAttribute, type Group } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { playgroundState } from "@/lib/motion/playgroundState";
import { damp } from "@/lib/motion/mathUtils";

interface GameAmbienceSceneProps {
  quality: "high" | "low";
}

const targetColor = new Color();

/**
 * Chapter 07 backdrop — the real "AI Playground" (see
 * components/game/AiPlayground.tsx) is DOM-driven, with each of its 4 games
 * owning its own small, self-contained R3F canvas for the actual
 * interaction. This shared, fixed-canvas scene only supplies a soft, slow
 * particle drift behind the whole chapter so the background stays alive and
 * the journey doesn't visually flatten out while the playground is in view —
 * its colour eases toward whichever game is currently focused
 * (`lib/motion/playgroundState.ts`), so the backdrop always reads as part of
 * the same story instead of a fixed, disconnected amber wash.
 */
export function GameAmbienceScene({ quality }: GameAmbienceSceneProps) {
  const groupRef = useRef<Group>(null);
  const handle = useRef<ParticleSystemHandle>(null);
  const initialized = useRef(false);
  const count = quality === "high" ? 600 : 220;

  useFrame((state, delta) => {
    const weight = journeyState.weight.game;
    const group = groupRef.current;
    if (group) {
      group.visible = weight > 0.001;
      group.rotation.y += delta * 0.01;
    }

    if (!initialized.current) {
      const positions = handle.current?.positions;
      if (positions) {
        const pointCount = positions.length / 3;
        for (let i = 0; i < pointCount; i += 1) {
          positions[i * 3] = (Math.random() - 0.5) * 10;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
        }
        const attribute = handle.current?.points?.geometry.attributes.position as BufferAttribute | undefined;
        if (attribute) attribute.needsUpdate = true;
        initialized.current = true;
      }
    }

    const material = handle.current?.material;
    if (material) {
      material.opacity = damp(material.opacity, 0.3 * weight, 4, delta);
      targetColor.set(playgroundState.accentHex);
      material.color.lerp(targetColor, 1 - Math.exp(-2 * delta));
    }
    if (handle.current?.points) {
      handle.current.points.position.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      <ParticleSystem ref={handle} count={count} size={0.025} color="#fcd34d" opacity={0} />
    </group>
  );
}
