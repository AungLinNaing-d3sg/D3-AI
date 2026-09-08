"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { BufferAttribute, Group, Mesh, MeshBasicMaterial } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { damp } from "@/lib/motion/mathUtils";

interface IntroSceneProps {
  quality: "high" | "low";
}

const NEBULA_COLORS = ["#4a7ba6", "#f14a30", "#22d3ee"];

/**
 * Chapter 01 — Cinematic AI Intro. A deep starfield plus three soft,
 * slow-drifting "nebula" spheres stand in for the atmospheric lighting/fog
 * of a cinematic establishing shot (no licensed video asset exists under
 * /docs — see components/sections/IntroSection.tsx for the architecture
 * that lets a real `<video>` be dropped in later without touching this
 * scene). The real cinematic weight comes from the large DOM typography and
 * the camera's slow push-in, driven by `journeyState.camera`.
 */
export function IntroScene({ quality }: IntroSceneProps) {
  const groupRef = useRef<Group>(null);
  const starsHandle = useRef<ParticleSystemHandle>(null);
  const nebulaRefs = useRef<Mesh[]>([]);
  const initialized = useRef(false);
  const count = quality === "high" ? 2200 : 800;

  useFrame((state, delta) => {
    const weight = journeyState.weight.intro;
    const group = groupRef.current;
    if (group) {
      group.visible = weight > 0.001;
      group.rotation.y += delta * 0.015;
    }

    if (!initialized.current) {
      const positions = starsHandle.current?.positions;
      if (positions) {
        const pointCount = positions.length / 3;
        for (let i = 0; i < pointCount; i += 1) {
          const radius = 4 + Math.random() * 5;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
          positions[i * 3 + 2] = radius * Math.cos(phi) - 3;
        }
        const attribute = starsHandle.current?.points?.geometry.attributes.position as
          | BufferAttribute
          | undefined;
        if (attribute) attribute.needsUpdate = true;
        initialized.current = true;
      }
    }

    const starMaterial = starsHandle.current?.material;
    if (starMaterial) {
      starMaterial.opacity = damp(starMaterial.opacity, 0.65 * weight, 4, delta);
    }

    nebulaRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const t = state.clock.elapsedTime * 0.2 + index * 2;
      mesh.position.y = Math.sin(t) * 0.4;
      mesh.position.x = Math.cos(t * 0.7) * 0.6 + (index - 1) * 2.4;
      const material = mesh.material as MeshBasicMaterial;
      material.opacity = damp(material.opacity, 0.12 * weight, 4, delta);
    });
  });

  return (
    <group ref={groupRef}>
      <ParticleSystem
        ref={starsHandle}
        count={count}
        size={0.045}
        color="#e5e9f2"
        opacity={0}
        additive
        sizeAttenuation
      />
      {NEBULA_COLORS.map((color, index) => (
        <mesh
          key={color}
          position={[(index - 1) * 2.4, 0, -4 - index]}
          ref={(mesh) => {
            if (mesh) nebulaRefs.current[index] = mesh;
          }}
        >
          <sphereGeometry args={[2.2, 24, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
