"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { BufferAttribute, Group, Mesh, MeshStandardMaterial } from "three";
import { FogExp2 } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { damp } from "@/lib/motion/mathUtils";

interface FutureSceneProps {
  quality: "high" | "low";
}

const MONOLITH_COUNT = 5;

/**
 * Chapter 08 — Cinematic AI Future. A calmer, more atmospheric register than
 * every scene before it: slow-drifting emissive monoliths, soft depth fog,
 * and fine dust, evoking the company's AI vision without a generic sci-fi
 * template (no starfields-and-lasers — just light, scale, and stillness).
 */
export function FutureScene({ quality }: FutureSceneProps) {
  const groupRef = useRef<Group>(null);
  const dustHandle = useRef<ParticleSystemHandle>(null);
  const dustInitialized = useRef(false);
  const monolithRefs = useRef<Mesh[]>([]);
  const scene = useThree((state) => state.scene);
  const dustCount = quality === "high" ? 900 : 320;

  const fog = useMemo(() => new FogExp2("#05070d", 0), []);

  const monolithLayout = useMemo(
    () =>
      Array.from({ length: MONOLITH_COUNT }, (_, i) => {
        const angle = (i / MONOLITH_COUNT) * Math.PI * 2;
        const radius = 3.4 + (i % 2) * 0.8;
        return {
          position: [Math.cos(angle) * radius, (i % 3) * 0.4 - 0.4, Math.sin(angle) * radius - 2] as [
            number,
            number,
            number,
          ],
          height: 1.4 + (i % 3) * 0.6,
        };
      }),
    []
  );

  useFrame((state, delta) => {
    const weight = journeyState.weight.future;
    const group = groupRef.current;
    if (group) group.visible = weight > 0.001;

    const previousFog = scene.fog;
    if (weight > 0.001) {
      scene.fog = fog;
      fog.density = damp(fog.density, 0.055, 3, delta);
    } else if (previousFog === fog) {
      fog.density = damp(fog.density, 0, 3, delta);
      if (fog.density < 0.002) scene.fog = null;
    }

    if (!dustInitialized.current) {
      const positions = dustHandle.current?.positions;
      if (positions) {
        const pointCount = positions.length / 3;
        for (let i = 0; i < pointCount; i += 1) {
          positions[i * 3] = (Math.random() - 0.5) * 16;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 16 - 4;
        }
        const attribute = dustHandle.current?.points?.geometry.attributes.position as
          | BufferAttribute
          | undefined;
        if (attribute) attribute.needsUpdate = true;
        dustInitialized.current = true;
      }
    }

    const dustMaterial = dustHandle.current?.material;
    if (dustMaterial) dustMaterial.opacity = damp(dustMaterial.opacity, 0.28 * weight, 4, delta);

    monolithRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const t = state.clock.elapsedTime * 0.15 + index * 1.7;
      mesh.position.y = (monolithLayout[index]?.position[1] ?? 0) + Math.sin(t) * 0.25;
      mesh.rotation.y += delta * (0.05 + index * 0.01);
      const material = mesh.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, 0.85 * weight, 4, delta);
      mesh.scale.setScalar(damp(mesh.scale.x, 0.85 + weight * 0.2, 4, delta));
    });
  });

  return (
    <group ref={groupRef}>
      <ParticleSystem ref={dustHandle} count={dustCount} size={0.018} color="#c7cfe0" opacity={0} />

      {monolithLayout.map((layout, index) => (
        <mesh
          key={`monolith-${index}`}
          position={layout.position}
          ref={(mesh) => {
            if (mesh) monolithRefs.current[index] = mesh;
          }}
        >
          <boxGeometry args={[0.3, layout.height, 0.3]} />
          <meshStandardMaterial
            transparent
            opacity={0}
            color="#7c8cff"
            emissive="#7c8cff"
            emissiveIntensity={0.5}
            roughness={0.2}
            metalness={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}
