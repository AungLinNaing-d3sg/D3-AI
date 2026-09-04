"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import type { BufferAttribute, Group, Mesh } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { damp } from "@/lib/motion/mathUtils";

interface CtaSceneProps {
  quality: "high" | "low";
}

/**
 * Chapter 09 — Final CTA. Everything the journey has built up (typography,
 * network, universe, product UI, cinematic monoliths) simplifies down to a
 * single soft, breathing glow — a calm, memorable full stop that mirrors
 * the DOM CTA's own minimalism (see components/sections/CtaSection.tsx).
 */
export function CtaScene({ quality }: CtaSceneProps) {
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);
  const sparkleHandle = useRef<ParticleSystemHandle>(null);
  const initialized = useRef(false);
  const count = quality === "high" ? 500 : 200;

  useFrame((state, delta) => {
    const weight = journeyState.weight.cta;
    const group = groupRef.current;
    if (group) group.visible = weight > 0.001;

    if (coreRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 0.6) * 0.05;
      coreRef.current.scale.setScalar(damp(coreRef.current.scale.x, weight * pulse, 4, delta));
      coreRef.current.rotation.y += delta * 0.08;
    }

    if (!initialized.current) {
      const positions = sparkleHandle.current?.positions;
      if (positions) {
        const pointCount = positions.length / 3;
        for (let i = 0; i < pointCount; i += 1) {
          const radius = 1.2 + Math.random() * 2.2;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
          positions[i * 3 + 2] = radius * Math.cos(phi);
        }
        const attribute = sparkleHandle.current?.points?.geometry.attributes.position as
          | BufferAttribute
          | undefined;
        if (attribute) attribute.needsUpdate = true;
        initialized.current = true;
      }
    }

    const sparkleMaterial = sparkleHandle.current?.material;
    if (sparkleMaterial) sparkleMaterial.opacity = damp(sparkleMaterial.opacity, 0.5 * weight, 4, delta);
  });

  return (
    <group ref={groupRef}>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.9, 8]} />
        <MeshDistortMaterial
          color="#f14a30"
          emissive="#f14a30"
          emissiveIntensity={0.7}
          roughness={0.15}
          metalness={0.3}
          distort={0.25}
          speed={1.2}
        />
      </mesh>
      <ParticleSystem ref={sparkleHandle} count={count} size={0.03} color="#ffe0db" opacity={0} additive />
    </group>
  );
}
