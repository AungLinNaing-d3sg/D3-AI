"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { BufferAttribute, Group } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { clamp, damp, lerp, smoothstep } from "@/lib/motion/mathUtils";
import { sampleTextPoints, scatterPoints } from "@/lib/three/textSampler";
import { typographyWords } from "@/data/journey";

interface TypographySceneProps {
  quality: "high" | "low";
}

/**
 * Chapter 02 — 3D AI Typography. Huge "physical" words built from thousands
 * of individual particles rather than flat HTML or a font-geometry asset
 * (see lib/three/textSampler.ts). As the chapter scrolls, particles morph
 * word → scatter → next word in sequence (D3-SG → DATA → DYNAMICS → DIGITAL
 * → AI), and the whole formation tilts gently toward the pointer so it
 * reads as a physical 3D object, not text.
 */
export function TypographyScene({ quality }: TypographySceneProps) {
  const groupRef = useRef<Group>(null);
  const handle = useRef<ParticleSystemHandle>(null);
  const count = quality === "high" ? 3600 : 1400;

  const keyframes = useMemo(() => {
    if (typeof document === "undefined") return [];
    const frames: Float32Array[] = [scatterPoints(count, 5.5)];
    typographyWords.forEach((word) => {
      frames.push(sampleTextPoints(word, count));
      frames.push(scatterPoints(count, 5.5));
    });
    return frames;
  }, [count]);

  const phases = useMemo(() => {
    const array = new Float32Array(count);
    for (let i = 0; i < count; i += 1) array[i] = Math.random() * Math.PI * 2;
    return array;
  }, [count]);

  const tilt = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const group = groupRef.current;
    const positions = handle.current?.positions;
    const material = handle.current?.material;
    const weight = journeyState.weight.typography;

    if (group) {
      group.visible = weight > 0.001;
      const pointer = journeyState.pointer;
      tilt.current.x = damp(tilt.current.x, pointer.y * 0.18, 3, delta);
      tilt.current.y = damp(tilt.current.y, pointer.x * 0.22, 3, delta);
      group.rotation.x = tilt.current.x;
      group.rotation.y = tilt.current.y + Math.sin(state.clock.elapsedTime * 0.05) * 0.05;
    }

    if (material) {
      material.opacity = damp(material.opacity, 0.9 * weight, 4, delta);
    }

    if (!positions || keyframes.length < 2 || weight <= 0.001) return;

    const segments = keyframes.length - 1;
    const local = clamp(journeyState.progress.typography);
    const scaled = Math.min(local, 0.9999) * segments;
    const index = Math.floor(scaled);
    const localT = smoothstep(0, 1, scaled - index);
    const from = keyframes[index] ?? keyframes[0];
    const to = keyframes[index + 1] ?? from;
    if (!from || !to) return;

    const shimmer = 0.025;
    const time = state.clock.elapsedTime;
    for (let i = 0; i < count; i += 1) {
      const base = i * 3;
      const phase = phases[i] ?? 0;
      const jitter = Math.sin(time * 0.8 + phase) * shimmer;
      positions[base] = lerp(from[base] ?? 0, to[base] ?? 0, localT) + jitter;
      positions[base + 1] = lerp(from[base + 1] ?? 0, to[base + 1] ?? 0, localT) + jitter * 0.6;
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
        size={0.032}
        color="#ff9280"
        opacity={0}
        additive
        sizeAttenuation
      />
    </group>
  );
}
