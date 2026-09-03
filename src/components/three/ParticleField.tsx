"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, type Group, type Points, type PointsMaterial } from "three";
import { sceneState } from "@/lib/motion/sceneState";

interface ParticleFieldProps {
  /** Lower particle counts on compact/low-power devices. */
  count?: number;
}

/**
 * Ambient "data point" starfield surrounding the core. Positions are
 * generated once and reused; only the group's overall spread (scale) and
 * material opacity are scroll-driven, so this stays cheap even with a few
 * thousand points.
 */
export function ParticleField({ count = 1400 }: ParticleFieldProps) {
  const groupRef = useRef<Group>(null);
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<PointsMaterial>(null);

  const positions = useMemo(() => {
    const array = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const radius = 1.6 + Math.random() * 2.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      array[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      array[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      array[i * 3 + 2] = radius * Math.cos(phi);
    }
    return array;
  }, [count]);

  useFrame((_, delta) => {
    const { particles } = sceneState;
    const group = groupRef.current;
    const material = materialRef.current;
    if (!group || !material) return;

    const targetScale = particles.spread / 4;
    group.scale.setScalar(MathUtils.lerp(group.scale.x, targetScale, 0.06));
    group.rotation.y += delta * 0.02;

    material.opacity = MathUtils.lerp(material.opacity, particles.opacity, 0.08);
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={materialRef}
          size={0.02}
          color="#c7cfe0"
          transparent
          opacity={0.5}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
