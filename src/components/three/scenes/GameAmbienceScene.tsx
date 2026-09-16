"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type BufferAttribute, type Group, type Mesh, type MeshBasicMaterial, type MeshStandardMaterial } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { playgroundState } from "@/lib/motion/playgroundState";
import { clamp, damp } from "@/lib/motion/mathUtils";
import { SCENE_TIER_CONFIG, tieredParticleCount, type SceneQuality } from "@/lib/three/deviceTiers";

interface GameAmbienceSceneProps {
  quality: SceneQuality;
}

const targetColor = new Color();

interface SatelliteLayout {
  radius: number;
  height: number;
  speed: number;
  phase: number;
  scale: number;
}

/** Fixed, hand-authored satellite orbits (not randomised — a consistent,
 * intentional composition on every load). Count is tiered by device below
 * (see `satelliteCount`) rather than these values changing. */
function buildSatelliteLayouts(count: number): SatelliteLayout[] {
  return Array.from({ length: count }, (_, i) => ({
    radius: 1.05 + (i % 2) * 0.4,
    height: (i - (count - 1) / 2) * 0.2,
    speed: 0.22 + i * 0.06,
    phase: (i / count) * Math.PI * 2,
    scale: 0.62 - i * 0.05,
  }));
}

/**
 * Chapter 06 backdrop — the real "AI Playground" (see
 * components/game/AiPlayground.tsx) is DOM-driven, with each of its 4 games
 * owning its own small, self-contained R3F canvas for the actual gameplay
 * interaction. This shared, fixed-canvas scene supplies the chapter's
 * atmosphere: a suspended, faceted "AI core" orbited by small satellite
 * shards on independent orbits, wrapped in a swirling particle halo — a real
 * interactive centerpiece rather than a plain drifting dust cloud. The core
 * tilts toward the live pointer position (`journeyState.pointer`, the same
 * damped-spring pattern every other chapter's scene already uses) and both
 * the satellites' orbit speed and the core's pulse energise slightly the
 * closer the pointer sits to the centre — a light, physics-like response to
 * cursor movement, layered on top of a permanent idle spin/pulse/swirl that
 * keeps the whole composition alive even when the pointer never moves. A
 * soft, flattened dark disc beneath fakes a contact shadow/AO cheaply,
 * without the cost of enabling real shadow maps on the shared canvas for a
 * single chapter's decorative backdrop. Colour eases toward whichever game
 * is currently focused (`lib/motion/playgroundState.ts`), so the backdrop
 * always reads as part of the same story instead of a fixed, disconnected
 * wash. Satellite/particle counts are device-tiered (see `SCENE_TIER_CONFIG`)
 * so mobile keeps a lighter, still-legible version of the same concept
 * instead of the full desktop composition.
 */
export function GameAmbienceScene({ quality }: GameAmbienceSceneProps) {
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);
  const wireRef = useRef<Mesh>(null);
  const shadowRef = useRef<Mesh>(null);
  const satelliteRefs = useRef<Mesh[]>([]);
  const handle = useRef<ParticleSystemHandle>(null);
  const initialized = useRef(false);
  const tilt = useRef({ x: 0, y: 0 });

  const count = tieredParticleCount(600, quality);
  const objectScale = SCENE_TIER_CONFIG[quality].objectScale;
  /** Fewer orbiting satellites on lower tiers — a lighter version of the
   * same concept, never a different one, so mobile still reads as "an
   * interactive core with things orbiting it". */
  const satelliteCount = quality === "low" ? 2 : quality === "medium" ? 3 : 4;
  const satelliteLayouts = useMemo(() => buildSatelliteLayouts(satelliteCount), [satelliteCount]);

  const swirl = useMemo(() => {
    const radii = new Float32Array(count);
    const heights = new Float32Array(count);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      radii[i] = 0.9 + Math.random() * 2.3;
      heights[i] = (Math.random() - 0.5) * 2.4;
      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.06 + Math.random() * 0.14;
    }
    return { radii, heights, phases, speeds };
  }, [count]);

  useFrame((state, delta) => {
    const weight = journeyState.weight.game;
    const group = groupRef.current;
    const time = state.clock.elapsedTime;
    const pointer = journeyState.pointer;
    const pointerEnergy = clamp(1 - Math.hypot(pointer.x, pointer.y) * 0.6, 0.4, 1);

    if (group) {
      group.visible = weight > 0.001;
      // Permanent idle spin (always running) plus a damped, spring-like tilt
      // toward the pointer layered on top — the same "idle animation stays
      // active, interaction only adds an offset" pattern used across every
      // chapter's scene, so the core never looks static while the pointer is
      // still, and never snaps/jitters when it moves.
      tilt.current.x = damp(tilt.current.x, pointer.y * 0.16, 3, delta);
      tilt.current.y = damp(tilt.current.y, pointer.x * 0.22, 3, delta);
      group.rotation.x = tilt.current.x;
      group.rotation.y = tilt.current.y + time * 0.08;
    }

    const targetHex = playgroundState.accentHex;
    targetColor.set(targetHex);

    const corePulse = 1 + Math.sin(time * 0.8) * 0.05 * pointerEnergy;
    if (coreRef.current) {
      const material = coreRef.current.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, 0.85 * weight, 4, delta);
      material.color.lerp(targetColor, 1 - Math.exp(-2 * delta));
      material.emissive.lerp(targetColor, 1 - Math.exp(-2 * delta));
      material.emissiveIntensity = damp(material.emissiveIntensity, 0.6 * pointerEnergy, 4, delta);
      coreRef.current.rotation.y += delta * 0.1;
      coreRef.current.scale.setScalar(damp(coreRef.current.scale.x, corePulse, 4, delta));
    }

    if (wireRef.current) {
      const material = wireRef.current.material as MeshBasicMaterial;
      material.opacity = damp(material.opacity, 0.3 * weight, 4, delta);
      material.color.lerp(targetColor, 1 - Math.exp(-2 * delta));
      wireRef.current.rotation.y -= delta * 0.06;
      wireRef.current.scale.setScalar(damp(wireRef.current.scale.x, corePulse * 1.2, 4, delta));
    }

    if (shadowRef.current) {
      const material = shadowRef.current.material as MeshBasicMaterial;
      material.opacity = damp(material.opacity, 0.32 * weight, 4, delta);
    }

    satelliteRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const layout = satelliteLayouts[i];
      if (!layout) return;
      const angle = layout.phase + time * layout.speed * pointerEnergy;
      mesh.position.set(Math.cos(angle) * layout.radius, layout.height + Math.sin(angle * 1.6) * 0.12, Math.sin(angle) * layout.radius);
      mesh.rotation.x += delta * 0.6;
      mesh.rotation.y += delta * 0.4;
      const material = mesh.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, 0.75 * weight, 5, delta);
      material.color.lerp(targetColor, 1 - Math.exp(-2 * delta));
      material.emissive.lerp(targetColor, 1 - Math.exp(-2 * delta));
    });

    if (!initialized.current) {
      const positions = handle.current?.positions;
      if (positions) {
        const pointCount = positions.length / 3;
        for (let i = 0; i < pointCount; i += 1) {
          const angle = swirl.phases[i] ?? 0;
          const radius = swirl.radii[i] ?? 1.5;
          positions[i * 3] = Math.cos(angle) * radius;
          positions[i * 3 + 1] = swirl.heights[i] ?? 0;
          positions[i * 3 + 2] = Math.sin(angle) * radius;
        }
        const attribute = handle.current?.points?.geometry.attributes.position as BufferAttribute | undefined;
        if (attribute) attribute.needsUpdate = true;
        initialized.current = true;
      }
    }

    const material = handle.current?.material;
    if (material) {
      material.opacity = damp(material.opacity, 0.32 * weight, 4, delta);
      material.color.lerp(targetColor, 1 - Math.exp(-2 * delta));
    }

    const positions = handle.current?.positions;
    if (positions && weight > 0.001) {
      const pointCount = positions.length / 3;
      for (let i = 0; i < pointCount; i += 1) {
        const angle = (swirl.phases[i] ?? 0) + time * (swirl.speeds[i] ?? 0.1) * pointerEnergy;
        const radius = swirl.radii[i] ?? 1.5;
        const base = i * 3;
        positions[base] = Math.cos(angle) * radius;
        positions[base + 1] = (swirl.heights[i] ?? 0) + Math.sin(time * 0.3 + angle) * 0.15;
        positions[base + 2] = Math.sin(angle) * radius;
      }
      const attribute = handle.current?.points?.geometry.attributes.position as BufferAttribute | undefined;
      if (attribute) attribute.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef} scale={objectScale}>
      <ParticleSystem ref={handle} count={count} size={0.024} color="#fcd34d" opacity={0} additive />

      {/* Soft, flattened dark disc beneath the core — a cheap fake contact
          shadow/AO instead of enabling real shadow maps on the shared canvas
          for one chapter's decorative backdrop. */}
      <mesh ref={shadowRef} position={[0, -0.85, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.85, 32]} />
        <meshBasicMaterial transparent opacity={0} color="#000000" depthWrite={false} />
      </mesh>

      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.58, 1]} />
        <meshStandardMaterial
          transparent
          opacity={0}
          color="#fcd34d"
          emissive="#fcd34d"
          emissiveIntensity={0.6}
          roughness={0.25}
          metalness={0.5}
        />
      </mesh>
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[0.58, 0]} />
        <meshBasicMaterial transparent opacity={0} color="#fcd34d" wireframe />
      </mesh>

      {satelliteLayouts.map((layout, index) => (
        <mesh
          key={`game-satellite-${index}`}
          scale={layout.scale}
          ref={(mesh) => {
            if (mesh) satelliteRefs.current[index] = mesh;
          }}
        >
          <octahedronGeometry args={[0.16, 0]} />
          <meshStandardMaterial
            transparent
            opacity={0}
            color="#fcd34d"
            emissive="#fcd34d"
            emissiveIntensity={0.7}
            roughness={0.3}
            metalness={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}
