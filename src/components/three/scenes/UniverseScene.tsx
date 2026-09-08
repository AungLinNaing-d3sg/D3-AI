"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { BufferAttribute, Group } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { clamp, damp, lerp, smoothstep } from "@/lib/motion/mathUtils";
import { galaxyPoints, sampleTextPoints } from "@/lib/three/textSampler";
import { universeStats } from "@/data/journey";

interface UniverseSceneProps {
  quality: "high" | "low";
}

/**
 * Chapter 05 — Data Universe. The neural network dissolves into a much
 * larger, denser particle field the camera travels through; along the way
 * the field periodically gathers into the company's real, modest proof
 * points (src/data/pillars.ts) rendered as particle-formed statistics
 * before dissolving back into the open field and, at the end, into the
 * floating product UI (chapter 05).
 */
export function UniverseScene({ quality }: UniverseSceneProps) {
  const groupRef = useRef<Group>(null);
  const handle = useRef<ParticleSystemHandle>(null);
  const count = quality === "high" ? 5200 : 2000;

  const keyframes = useMemo(() => {
    if (typeof document === "undefined") return [];
    const frames: Float32Array[] = [galaxyPoints(count, 8)];
    universeStats.forEach((stat) => {
      frames.push(sampleTextPoints(stat.token, count, 240, 4.4));
      frames.push(galaxyPoints(count, 8));
    });
    return frames;
  }, [count]);

  const phases = useMemo(() => {
    const array = new Float32Array(count);
    for (let i = 0; i < count; i += 1) array[i] = Math.random() * Math.PI * 2;
    return array;
  }, [count]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    const positions = handle.current?.positions;
    const material = handle.current?.material;
    const weight = journeyState.weight.universe;

    if (group) {
      group.visible = weight > 0.001;
      group.rotation.y += delta * 0.02;
    }

    if (material) {
      material.opacity = damp(material.opacity, 0.85 * weight, 4, delta);
    }

    if (!positions || keyframes.length < 2 || weight <= 0.001) return;

    const segments = keyframes.length - 1;
    const local = clamp(journeyState.progress.universe);
    const scaled = Math.min(local, 0.9999) * segments;
    const index = Math.floor(scaled);
    const localT = smoothstep(0, 1, scaled - index);
    const from = keyframes[index] ?? keyframes[0];
    const to = keyframes[index + 1] ?? from;
    if (!from || !to) return;

    const time = state.clock.elapsedTime;
    for (let i = 0; i < count; i += 1) {
      const base = i * 3;
      const phase = phases[i] ?? 0;
      const drift = Math.sin(time * 0.4 + phase) * 0.04;
      positions[base] = lerp(from[base] ?? 0, to[base] ?? 0, localT) + drift;
      positions[base + 1] = lerp(from[base + 1] ?? 0, to[base + 1] ?? 0, localT) + drift * 0.5;
      positions[base + 2] = lerp(from[base + 2] ?? 0, to[base + 2] ?? 0, localT);
    }

    const attribute = handle.current?.points?.geometry.attributes.position as BufferAttribute | undefined;
    if (attribute) attribute.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <ParticleSystem
        ref={handle}
        count={count}
        size={0.026}
        color="#a5b4fc"
        opacity={0}
        additive
        sizeAttenuation
      />
    </group>
  );
}
