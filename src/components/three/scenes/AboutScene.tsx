"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { BufferAttribute, Group, LineBasicMaterial, Mesh, MeshBasicMaterial, MeshStandardMaterial } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { damp } from "@/lib/motion/mathUtils";
import { aboutTeamNodes, aboutTeamRanges } from "@/data/journey";

interface AboutSceneProps {
  quality: "high" | "low";
}

/** A short, still skyline silhouette — evokes the company's Singapore base
 * without depicting a literal building/photo. Heights are derived
 * deterministically (no randomness) so server/client markup never mismatches. */
const SKYLINE_HEIGHTS = [0.55, 0.95, 0.7, 1.25, 0.8, 1.05, 0.6];

/**
 * Chapter 02 — About Us / Who we are. The cinematic intro settles into a
 * single faceted "identity emblem" — the fusion of the company's three real
 * disciplines (Data, Dynamics, Digital — see the Typography chapter right
 * after this one) into one core — orbited by the real leadership team
 * (src/data/team.ts, sourced from the existing About Us page copy, labelled
 * via drei `<Html>` the same way the Neural Network chapter labels its
 * concept nodes) and grounded by a low, still skyline silhouette. Warm,
 * premium lighting (see lib/motion/scrollTimeline.ts's "about" keyframe) and
 * slow-rising light motes give this chapter its own distinct register —
 * calmer and warmer than the cooler, more technical chapters either side of
 * it — rather than reusing another chapter's visual language.
 */
export function AboutScene({ quality }: AboutSceneProps) {
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);
  const wireRef = useRef<Mesh>(null);
  const nodeRefs = useRef<Mesh[]>([]);
  const spokeMaterialRefs = useRef<LineBasicMaterial[]>([]);
  const skylineRefs = useRef<Mesh[]>([]);
  const motesHandle = useRef<ParticleSystemHandle>(null);
  const motesInitialized = useRef(false);
  const moteCount = quality === "high" ? 420 : 160;

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

  useFrame((_, delta) => {
    const weight = journeyState.weight.about;
    const progress = journeyState.progress.about;
    const group = groupRef.current;

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
    });

    if (!motesInitialized.current) {
      const positions = motesHandle.current?.positions;
      if (positions) {
        const pointCount = positions.length / 3;
        for (let i = 0; i < pointCount; i += 1) {
          positions[i * 3] = (Math.random() - 0.5) * 6;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 4.4;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
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
    <group ref={groupRef}>
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
          <Html center distanceFactor={9} className="pointer-events-none select-none">
            <span className="whitespace-nowrap rounded-full border border-white/20 bg-ink-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur">
              {node.label}
            </span>
          </Html>
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
