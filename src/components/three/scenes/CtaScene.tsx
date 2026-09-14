"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import type { BufferAttribute, Group, Mesh, MeshPhysicalMaterial } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { damp } from "@/lib/motion/mathUtils";
import { SCENE_TIER_CONFIG, tieredParticleCount, type SceneQuality } from "@/lib/three/deviceTiers";

interface CtaSceneProps {
  quality: SceneQuality;
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
  const count = tieredParticleCount(500, quality);
  const objectScale = SCENE_TIER_CONFIG[quality].objectScale;

  useFrame((state, delta) => {
    const weight = journeyState.weight.cta;
    const group = groupRef.current;
    if (group) group.visible = weight > 0.001;

    if (coreRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 0.6) * 0.05;
      coreRef.current.scale.setScalar(damp(coreRef.current.scale.x, Math.max(weight * pulse, 0.001), 4, delta));
      coreRef.current.rotation.y += delta * 0.08;

      // Was fully opaque with no opacity fade of its own (relying only on
      // `scale` to hide it) — combined with the brightest key light in the
      // whole journey (see lightKeyframes in lib/motion/scrollTimeline.ts,
      // now toned down) this read as a large, solid, saturated-orange blob
      // sitting directly behind the centred CTA heading/copy, hurting
      // contrast. Fading `opacity` in lockstep with every other chapter's
      // scene keeps the glow soft throughout its entrance/exit, not just at
      // its extremes.
      const material = coreRef.current.material as MeshPhysicalMaterial;
      material.opacity = damp(material.opacity, 0.78 * weight, 4, delta);
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
    <group ref={groupRef} scale={objectScale}>
      {/* Set back from the camera (rather than centred at the origin,
          directly behind the CTA heading) and toned down in
          size/emissive intensity — see the readability note in `useFrame`
          above — so it reads as an atmospheric glow behind the copy instead
          of a bright, saturated shape competing with it. */}
      <mesh ref={coreRef} position={[0, 0, -1.6]}>
        <icosahedronGeometry args={[0.72, 8]} />
        <MeshDistortMaterial
          transparent
          opacity={0}
          color="#f14a30"
          emissive="#f14a30"
          emissiveIntensity={0.45}
          roughness={0.2}
          metalness={0.25}
          distort={0.22}
          speed={1.2}
        />
      </mesh>
      <ParticleSystem ref={sparkleHandle} count={count} size={0.03} color="#ffe0db" opacity={0} additive />
    </group>
  );
}
