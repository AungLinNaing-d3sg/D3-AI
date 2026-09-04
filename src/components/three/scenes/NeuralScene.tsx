"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { BufferAttribute, Group, LineBasicMaterial, Mesh, MeshStandardMaterial } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { damp, smoothstep } from "@/lib/motion/mathUtils";
import { primaryConceptNodes, secondaryConceptNodes } from "@/data/journey";

interface NeuralSceneProps {
  quality: "high" | "low";
}

const SCENE_SCALE = 1.7;

function nearestPrimaryIndex(position: readonly [number, number, number]): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  primaryConceptNodes.forEach((node, index) => {
    const dx = node.position[0] - position[0];
    const dy = node.position[1] - position[1];
    const dz = node.position[2] - position[2];
    const distance = dx * dx + dy * dy + dz * dz;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}

/**
 * Chapter 04 — AI Neural Network. The typography particles (chapter 03)
 * dissolve into a live graph: 5 primary AI-concept nodes (THINK, LEARN,
 * UNDERSTAND, PREDICT, CREATE — labelled via drei `<Html>`) plus the real
 * technology ecosystem (src/data/technology.ts) as secondary nodes, joined
 * by spokes to their nearest concept, staggered in as the chapter scrolls,
 * with an ambient "synapse dust" field for depth. The whole graph tilts
 * gently toward the pointer for a subtle sense of interactivity/aliveness.
 */
export function NeuralScene({ quality }: NeuralSceneProps) {
  const groupRef = useRef<Group>(null);
  const dustHandle = useRef<ParticleSystemHandle>(null);
  const dustInitialized = useRef(false);
  const primaryMeshRefs = useRef<Mesh[]>([]);
  const secondaryMeshRefs = useRef<Mesh[]>([]);
  const spokeMaterialRefs = useRef<LineBasicMaterial[]>([]);
  const ringMaterialRefs = useRef<LineBasicMaterial[]>([]);
  const tilt = useRef({ x: 0, y: 0 });

  const dustCount = quality === "high" ? 900 : 350;

  const spokes = useMemo(
    () =>
      secondaryConceptNodes.map((node) => ({
        node,
        primaryIndex: nearestPrimaryIndex(node.position),
      })),
    []
  );

  const spokePositions = useMemo(
    () =>
      spokes.map(({ node, primaryIndex }) => {
        const from = primaryConceptNodes[primaryIndex]?.position ?? [0, 0, 0];
        return new Float32Array([
          from[0] * SCENE_SCALE,
          from[1] * SCENE_SCALE,
          from[2] * SCENE_SCALE,
          node.position[0] * SCENE_SCALE,
          node.position[1] * SCENE_SCALE,
          node.position[2] * SCENE_SCALE,
        ]);
      }),
    [spokes]
  );

  const ringPositions = useMemo(
    () =>
      primaryConceptNodes.map((node, index) => {
        const next = primaryConceptNodes[(index + 1) % primaryConceptNodes.length];
        if (!next) return new Float32Array(6);
        return new Float32Array([
          node.position[0] * SCENE_SCALE,
          node.position[1] * SCENE_SCALE,
          node.position[2] * SCENE_SCALE,
          next.position[0] * SCENE_SCALE,
          next.position[1] * SCENE_SCALE,
          next.position[2] * SCENE_SCALE,
        ]);
      }),
    []
  );

  useFrame((state, delta) => {
    const weight = journeyState.weight.neural;
    const progress = journeyState.progress.neural;
    const group = groupRef.current;

    if (group) {
      group.visible = weight > 0.001;
      const pointer = journeyState.pointer;
      tilt.current.x = damp(tilt.current.x, pointer.y * 0.12, 3, delta);
      tilt.current.y = damp(tilt.current.y, pointer.x * 0.16, 3, delta);
      group.rotation.x = tilt.current.x;
      group.rotation.y = tilt.current.y + state.clock.elapsedTime * 0.025;
    }

    if (!dustInitialized.current) {
      const positions = dustHandle.current?.positions;
      if (positions) {
        const pointCount = positions.length / 3;
        for (let i = 0; i < pointCount; i += 1) {
          const radius = 1 + Math.random() * 3.4;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta) * SCENE_SCALE;
          positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * SCENE_SCALE * 0.6;
          positions[i * 3 + 2] = radius * Math.cos(phi) * SCENE_SCALE;
        }
        const attribute = dustHandle.current?.points?.geometry.attributes.position as
          | BufferAttribute
          | undefined;
        if (attribute) attribute.needsUpdate = true;
        dustInitialized.current = true;
      }
    }

    const dustMaterial = dustHandle.current?.material;
    if (dustMaterial) dustMaterial.opacity = damp(dustMaterial.opacity, 0.35 * weight, 4, delta);

    const allMeshes = [...primaryMeshRefs.current, ...secondaryMeshRefs.current];
    const appearValues = allMeshes.map((_, i) => smoothstep(i * 0.055, i * 0.055 + 0.2, progress));

    allMeshes.forEach((mesh, i) => {
      if (!mesh) return;
      const appear = appearValues[i] ?? 0;
      const targetScale = 0.4 + appear * 0.7;
      mesh.scale.setScalar(damp(mesh.scale.x, targetScale, 6, delta));
      const material = mesh.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, appear * weight, 5, delta);
      material.emissiveIntensity = damp(material.emissiveIntensity, 0.6 + appear * 0.8, 5, delta);
    });

    spokeMaterialRefs.current.forEach((material, i) => {
      if (!material) return;
      const secondaryAppear = appearValues[primaryConceptNodes.length + i] ?? 0;
      const primaryAppear = appearValues[spokes[i]?.primaryIndex ?? 0] ?? 0;
      const target = Math.min(secondaryAppear, primaryAppear) * weight * 0.55;
      material.opacity = damp(material.opacity, target, 5, delta);
    });

    ringMaterialRefs.current.forEach((material, i) => {
      if (!material) return;
      const a = appearValues[i] ?? 0;
      const b = appearValues[(i + 1) % primaryConceptNodes.length] ?? 0;
      material.opacity = damp(material.opacity, Math.min(a, b) * weight * 0.7, 5, delta);
    });
  });

  return (
    <group ref={groupRef}>
      <ParticleSystem ref={dustHandle} count={dustCount} size={0.02} color="#67e8f9" opacity={0} additive />

      {primaryConceptNodes.map((node, index) => (
        <mesh
          key={node.id}
          position={[node.position[0] * SCENE_SCALE, node.position[1] * SCENE_SCALE, node.position[2] * SCENE_SCALE]}
          ref={(mesh) => {
            if (mesh) primaryMeshRefs.current[index] = mesh;
          }}
        >
          <icosahedronGeometry args={[0.24, 1]} />
          <meshStandardMaterial
            transparent
            opacity={0}
            color="#f14a30"
            emissive="#f14a30"
            emissiveIntensity={0.6}
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

      {secondaryConceptNodes.map((node, index) => (
        <mesh
          key={node.id}
          position={[node.position[0] * SCENE_SCALE, node.position[1] * SCENE_SCALE, node.position[2] * SCENE_SCALE]}
          ref={(mesh) => {
            if (mesh) secondaryMeshRefs.current[index] = mesh;
          }}
        >
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial
            transparent
            opacity={0}
            color="#67e8f9"
            emissive="#22d3ee"
            emissiveIntensity={0.6}
            roughness={0.25}
            metalness={0.5}
          />
        </mesh>
      ))}

      {spokePositions.map((positions, i) => (
        <line key={`spoke-${secondaryConceptNodes[i]?.id ?? i}`}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            transparent
            opacity={0}
            color="#9aa6c2"
            ref={(material) => {
              if (material) spokeMaterialRefs.current[i] = material;
            }}
          />
        </line>
      ))}

      {ringPositions.map((positions, i) => (
        <line key={`ring-${primaryConceptNodes[i]?.id ?? i}`}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            transparent
            opacity={0}
            color="#fd6a50"
            ref={(material) => {
              if (material) ringMaterialRefs.current[i] = material;
            }}
          />
        </line>
      ))}
    </group>
  );
}
