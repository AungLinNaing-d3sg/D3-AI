"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide } from "three";
import type { BufferAttribute, Group, LineBasicMaterial, Mesh, MeshBasicMaterial, MeshStandardMaterial } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { damp } from "@/lib/motion/mathUtils";
import { aboutTeamNodes, aboutTeamRanges } from "@/data/journey";
import { SCENE_TIER_CONFIG, tieredParticleCount, type SceneQuality } from "@/lib/three/deviceTiers";

interface AboutSceneProps {
  quality: SceneQuality;
}

/** A short, still skyline silhouette — evokes the company's Singapore base
 * without depicting a literal building/photo. Heights are derived
 * deterministically (no randomness) so server/client markup never mismatches. */
const SKYLINE_HEIGHTS = [0.55, 0.95, 0.7, 1.25, 0.8, 1.05, 0.6];

/** Fixed, hand-authored "floating glass" ring layers orbiting the identity
 * emblem — deliberately not randomised (server/client markup parity, and a
 * consistent, intentional composition on every load). Kept small in number
 * and gated by device tier below (see `ringCount` in the component) rather
 * than scaled by particle-count tiering, since these are a handful of cheap
 * transparent meshes, not a particle field. */
const GLASS_RING_LAYOUTS = [
  { radius: 1.55, tube: 0.012, tiltX: Math.PI / 2.6, tiltZ: 0.32, color: "#e8b673", speed: 0.05 },
  { radius: 1.92, tube: 0.009, tiltX: Math.PI / 3.4, tiltZ: -0.55, color: "#fd6a50", speed: -0.035 },
] as const;

/**
 * Chapter 02 — About Us / Who we are. The cinematic intro settles into a
 * single faceted "identity emblem" — the fusion of the company's three real
 * disciplines (Data, Dynamics, Digital — see the Typography chapter right
 * after this one) into one core — orbited by the real leadership team
 * (src/data/team.ts) as small glowing halo-ringed nodes (no literal
 * name/initial labels here — those belong to the always-visible, accessible
 * team roster with real photos in components/sections/AboutSection.tsx, this
 * scene stays purely symbolic) and grounded by a low, still skyline
 * silhouette. A soft outer glow aura and two slowly counter-rotating,
 * translucent "glass" ring layers at different depths/tilts give the
 * composition dimension and a premium, floating feel instead of reading as a
 * flat backdrop. Warm, premium lighting (see lib/motion/scrollTimeline.ts's
 * "about" keyframe) and slow-rising light motes, gathered in an organic
 * spherical drift rather than a flat box, give this chapter its own distinct
 * register — calmer and warmer than the cooler, more technical chapters
 * either side of it.
 */
export function AboutScene({ quality }: AboutSceneProps) {
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);
  const wireRef = useRef<Mesh>(null);
  const auraRef = useRef<Mesh>(null);
  const ringRefs = useRef<Mesh[]>([]);
  const nodeRefs = useRef<Mesh[]>([]);
  const haloRefs = useRef<Mesh[]>([]);
  const spokeMaterialRefs = useRef<LineBasicMaterial[]>([]);
  const skylineRefs = useRef<Mesh[]>([]);
  const motesHandle = useRef<ParticleSystemHandle>(null);
  const motesInitialized = useRef(false);
  const moteCount = tieredParticleCount(420, quality);
  const objectScale = SCENE_TIER_CONFIG[quality].objectScale;
  /** One floating glass ring on mobile (cheaper), the full two-layer
   * composition on tablet/desktop — see `GLASS_RING_LAYOUTS` above. */
  const ringCount = quality === "low" ? 1 : GLASS_RING_LAYOUTS.length;
  /** Per-node halo rings are a purely decorative flourish (they replace the
   * old text-label affordance) — skipped on the lowest tier to keep the
   * mobile frame budget for the particle field and emblem itself. */
  const showNodeHalos = quality !== "low";

  const skylineLayout = useMemo(
    () =>
      SKYLINE_HEIGHTS.map((height, index) => ({
        x: (index - (SKYLINE_HEIGHTS.length - 1) / 2) * 0.85,
        height,
      })),
    []
  );

  const spokePositions = useMemo(
    () =>
      aboutTeamNodes.map(
        (node) => new Float32Array([0, 0, 0, node.position[0], node.position[1], node.position[2]])
      ),
    []
  );

  useFrame((state, delta) => {
    const weight = journeyState.weight.about;
    const progress = journeyState.progress.about;
    const group = groupRef.current;
    const time = state.clock.elapsedTime;

    if (group) {
      group.visible = weight > 0.001;
      group.rotation.y += delta * 0.05;
    }

    const coreScale = 0.85 + weight * 0.15;

    if (coreRef.current) {
      const material = coreRef.current.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, 0.9 * weight, 4, delta);
      coreRef.current.rotation.x += delta * 0.06;
      coreRef.current.scale.setScalar(damp(coreRef.current.scale.x, coreScale, 4, delta));
    }

    if (wireRef.current) {
      const material = wireRef.current.material as MeshBasicMaterial;
      material.opacity = damp(material.opacity, 0.35 * weight, 4, delta);
      wireRef.current.scale.setScalar(damp(wireRef.current.scale.x, coreScale * 1.18, 4, delta));
    }

    if (auraRef.current) {
      const material = auraRef.current.material as MeshBasicMaterial;
      material.opacity = damp(material.opacity, 0.14 * weight, 3, delta);
      const pulse = 1 + Math.sin(time * 0.35) * 0.05;
      auraRef.current.scale.setScalar(damp(auraRef.current.scale.x, coreScale * 1.9 * pulse, 3, delta));
    }

    ringRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const layout = GLASS_RING_LAYOUTS[i];
      if (!layout) return;
      mesh.rotation.z += delta * layout.speed;
      mesh.rotation.x = layout.tiltX + Math.sin(time * 0.12 + i) * 0.04;
      const material = mesh.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, 0.22 * weight, 4, delta);
    });

    skylineRefs.current.forEach((mesh) => {
      if (!mesh) return;
      const material = mesh.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, 0.5 * weight, 4, delta);
    });

    aboutTeamNodes.forEach((_node, index) => {
      const mesh = nodeRefs.current[index];
      const range = aboutTeamRanges[index];
      if (!mesh || !range) return;
      const isActive = progress >= range.start && progress < range.end;
      const target = (isActive ? 1 : 0.45) * weight;
      const material = mesh.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, target, 5, delta);
      material.emissiveIntensity = damp(material.emissiveIntensity, isActive ? 1.1 : 0.5, 5, delta);
      mesh.scale.setScalar(damp(mesh.scale.x, isActive ? 1.15 : 0.85, 6, delta));

      const spokeMaterial = spokeMaterialRefs.current[index];
      if (spokeMaterial) {
        spokeMaterial.opacity = damp(spokeMaterial.opacity, target * 0.4, 5, delta);
      }

      const halo = haloRefs.current[index];
      if (halo) {
        halo.rotation.z += delta * (isActive ? 0.5 : 0.15);
        const haloMaterial = halo.material as MeshBasicMaterial;
        haloMaterial.opacity = damp(haloMaterial.opacity, target * 0.6, 5, delta);
        halo.scale.setScalar(damp(halo.scale.x, isActive ? 1.3 : 1, 6, delta));
      }
    });

    if (!motesInitialized.current) {
      const positions = motesHandle.current?.positions;
      if (positions) {
        const pointCount = positions.length / 3;
        for (let i = 0; i < pointCount; i += 1) {
          // Organic, gathered-around-the-emblem spherical drift rather than a
          // flat rectangular box — reads as atmosphere with real depth
          // instead of a boxy backdrop.
          const radius = 0.8 + Math.random() * 2.6;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.7;
          positions[i * 3 + 2] = radius * Math.cos(phi) * 0.65 - 1;
        }
        const attribute = motesHandle.current?.points?.geometry.attributes.position as
          | BufferAttribute
          | undefined;
        if (attribute) attribute.needsUpdate = true;
        motesInitialized.current = true;
      }
    }

    const motesMaterial = motesHandle.current?.material;
    if (motesMaterial) motesMaterial.opacity = damp(motesMaterial.opacity, 0.4 * weight, 4, delta);

    const motesPositions = motesHandle.current?.positions;
    if (motesPositions && weight > 0.001) {
      const pointCount = motesPositions.length / 3;
      for (let i = 0; i < pointCount; i += 1) {
        const base = i * 3;
        const y = motesPositions[base + 1] ?? 0;
        const nextY = y + delta * (0.1 + (i % 5) * 0.02);
        motesPositions[base + 1] = nextY > 2.2 ? -2.2 : nextY;
      }
      const attribute = motesHandle.current?.points?.geometry.attributes.position as BufferAttribute | undefined;
      if (attribute) attribute.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef} scale={objectScale}>
      <ParticleSystem ref={motesHandle} count={moteCount} size={0.022} color="#ffd9a0" opacity={0} />

      {skylineLayout.map((layout, index) => (
        <mesh
          key={`about-skyline-${index}`}
          position={[layout.x, -1.35 + layout.height / 2, -2.6]}
          ref={(mesh) => {
            if (mesh) skylineRefs.current[index] = mesh;
          }}
        >
          <boxGeometry args={[0.34, layout.height, 0.34]} />
          <meshStandardMaterial
            transparent
            opacity={0}
            color="#c7cfe0"
            emissive="#e8b673"
            emissiveIntensity={0.25}
            roughness={0.6}
            metalness={0.2}
          />
        </mesh>
      ))}

      {/* Soft outer glow halo behind the emblem — additive, unlit, so it
          reads as a warm ambient bloom rather than a solid object. */}
      <mesh ref={auraRef}>
        <icosahedronGeometry args={[0.72, 1]} />
        <meshBasicMaterial transparent opacity={0} color="#ffcf9e" depthWrite={false} />
      </mesh>

      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.72, 1]} />
        <meshStandardMaterial
          transparent
          opacity={0}
          color="#e5e9f2"
          emissive="#fd6a50"
          emissiveIntensity={0.55}
          roughness={0.25}
          metalness={0.5}
        />
      </mesh>
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[0.72, 0]} />
        <meshBasicMaterial transparent opacity={0} color="#fd6a50" wireframe />
      </mesh>

      {/* Floating "glass" ring layers — translucent, softly lit tori at
          different depths/tilts orbiting the emblem, giving the composition
          dimension and a premium, layered feel instead of a flat backdrop.
          One layer on the lowest mobile tier, both on tablet/desktop. */}
      {GLASS_RING_LAYOUTS.slice(0, ringCount).map((layout, index) => (
        <mesh
          key={`about-glass-ring-${index}`}
          rotation={[layout.tiltX, 0, layout.tiltZ]}
          ref={(mesh) => {
            if (mesh) ringRefs.current[index] = mesh;
          }}
        >
          <torusGeometry args={[layout.radius, layout.tube, 16, 100]} />
          <meshStandardMaterial
            transparent
            opacity={0}
            color={layout.color}
            emissive={layout.color}
            emissiveIntensity={0.4}
            roughness={0.2}
            metalness={0.3}
            side={DoubleSide}
          />
        </mesh>
      ))}

      {aboutTeamNodes.map((node, index) => (
        <mesh
          key={node.id}
          position={node.position}
          ref={(mesh) => {
            if (mesh) nodeRefs.current[index] = mesh;
          }}
        >
          <sphereGeometry args={[0.14, 20, 20]} />
          <meshStandardMaterial
            transparent
            opacity={0}
            color="#ffe0db"
            emissive="#fd6a50"
            emissiveIntensity={0.5}
            roughness={0.3}
            metalness={0.4}
          />
          {showNodeHalos ? (
            <mesh
              ref={(mesh) => {
                if (mesh) haloRefs.current[index] = mesh;
              }}
            >
              <torusGeometry args={[0.22, 0.006, 8, 32]} />
              <meshBasicMaterial transparent opacity={0} color="#ffd9a0" />
            </mesh>
          ) : null}
        </mesh>
      ))}

      {spokePositions.map((positions, index) => (
        <line key={`about-spoke-${aboutTeamNodes[index]?.id ?? index}`}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            transparent
            opacity={0}
            color="#e8b673"
            ref={(material) => {
              if (material) spokeMaterialRefs.current[index] = material;
            }}
          />
        </line>
      ))}
    </group>
  );
}
