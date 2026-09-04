"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { BufferAttribute, Group } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { damp } from "@/lib/motion/mathUtils";

interface GameAmbienceSceneProps {
  quality: "high" | "low";
}

/**
 * Chapter 07 backdrop — "TRAIN YOUR AI" is a real DOM/canvas-2D interactive
 * mini-game (see components/game/TrainYourAI.tsx), kept deliberately simple
 * and dependency-free for responsiveness. This scene only supplies a soft,
 * slow amber particle drift behind it so the fixed 3D canvas stays alive
 * and the journey doesn't visually flatten out while the game is in view.
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
    if (material) material.opacity = damp(material.opacity, 0.3 * weight, 4, delta);
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
