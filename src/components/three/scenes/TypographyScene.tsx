"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { BufferAttribute, Group } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { clamp, damp, lerp, smoothstep } from "@/lib/motion/mathUtils";
import { sampleTextPoints, scatterPoints } from "@/lib/three/textSampler";
import { typographyWords } from "@/data/journey";
import { SCENE_TIER_CONFIG, tieredParticleCount, type SceneQuality } from "@/lib/three/deviceTiers";

interface TypographySceneProps {
  quality: SceneQuality;
}

/** Must match the `worldScale` passed to `sampleTextPoints` below — the
 * single source of truth both the particle sampling and the mobile/tablet
 * frustum-fit computation (see the `quality !== "high"` branch in `useFrame`)
 * read from, so they can never drift out of sync. */
const TEXT_WORLD_SCALE = 3.6;

/** `sampleTextPoints` shrinks each word's font until it fits within 90% of
 * its sampling canvas — this mirrors that same ratio so the fit-to-viewport
 * calculation below reasons about the word's actual worst-case rendered
 * width, not the full (padded) `TEXT_WORLD_SCALE` bounding box. */
const TEXT_MAX_WIDTH_RATIO = 0.9;

/** Fraction of the currently-visible frustum width the formed word may
 * occupy on tablet/mobile — leaves a small breathing-room margin either
 * side rather than fitting exactly edge-to-edge. */
const MOBILE_FIT_MARGIN = 0.92;

/**
 * Chapter 03 — 3D AI Typography. Huge "physical" words built from thousands
 * of individual particles rather than flat HTML or a font-geometry asset
 * (see lib/three/textSampler.ts). As the chapter scrolls, particles morph
 * word → scatter → next word in sequence (D3-SG → DATA → DYNAMICS → DIGITAL
 * → AI), and the whole formation tilts gently toward the pointer so it
 * reads as a physical 3D object, not text.
 */
export function TypographyScene({ quality }: TypographySceneProps) {
  const groupRef = useRef<Group>(null);
  const handle = useRef<ParticleSystemHandle>(null);
  const count = tieredParticleCount(3600, quality);
  const objectScale = SCENE_TIER_CONFIG[quality].objectScale;

  const keyframes = useMemo(() => {
    if (typeof document === "undefined") return [];
    const frames: Float32Array[] = [scatterPoints(count, 5.5)];
    typographyWords.forEach((word) => {
      frames.push(sampleTextPoints(word, count, 220, TEXT_WORLD_SCALE));
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
  const fitScale = useRef(objectScale);

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

      // A portrait phone's much narrower horizontal FOV (a function of
      // aspect ratio, not just device tier) can still clip the formed
      // word's edges even after `objectScale` — so, only below the desktop
      // tier (desktop keeps its exact authored scale, untouched), keep
      // re-fitting the group to whatever width is actually visible at this
      // depth right now, on top of (never beyond) the tier's own scale.
      let targetScale = objectScale;
      if (quality !== "high") {
        const viewport = state.viewport.getCurrentViewport(state.camera, [0, 0, 0], state.size);
        const textWorldWidth = TEXT_WORLD_SCALE * 2 * TEXT_MAX_WIDTH_RATIO;
        const fitToViewport = (viewport.width * MOBILE_FIT_MARGIN) / textWorldWidth;
        targetScale = Math.min(objectScale, fitToViewport);
      }
      fitScale.current = damp(fitScale.current, Math.max(targetScale, 0.001), 4, delta);
      group.scale.setScalar(fitScale.current);
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
    <group ref={groupRef} scale={objectScale}>
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
