"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type BufferAttribute, type Mesh, type MeshStandardMaterial } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { damp } from "@/lib/motion/mathUtils";
import type { BuildTestStatus } from "@/components/game/BuildTestExperience.types";

/**
 * Decorative R3F visuals for experience 3/4 ("Build & Test", see
 * components/game/BuildTestExperience.tsx). A single reactive "analysis
 * core" whose colour/intensity/particle activity tracks the real
 * analyze → implement → test → fix → verify status the accessible dev
 * workstation panel is showing — not a generic ambient backdrop. Lives under
 * `components/three/**` for the imperative-mutation lint carve-out (see
 * eslint.config.mjs).
 */

const STATUS_COLOR: Record<BuildTestStatus, string> = {
  idle: "#4b5468",
  analyzing: "#22d3ee",
  implementing: "#fd6a50",
  testing: "#a78bfa",
  fixing: "#fbbf24",
  verified: "#34d399",
};

function AnalysisCore({ status }: { status: BuildTestStatus }) {
  const meshRef = useRef<Mesh>(null);
  const wireRef = useRef<Mesh>(null);
  const coreMaterial = useRef<MeshStandardMaterial>(null);
  const target = useMemo(() => new Color(), []);

  useFrame((state, delta) => {
    target.set(STATUS_COLOR[status]);
    const active = status !== "idle";
    const speed = status === "testing" ? 3.4 : status === "implementing" ? 2.4 : 1.2;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * speed) * (active ? 0.12 : 0.03);

    const mesh = meshRef.current;
    const material = coreMaterial.current;
    if (mesh && material) {
      mesh.scale.setScalar(damp(mesh.scale.x, pulse, 6, delta));
      mesh.rotation.y += delta * (active ? 0.5 : 0.15);
      material.color.lerp(target, 1 - Math.exp(-5 * delta));
      material.emissive.lerp(target, 1 - Math.exp(-5 * delta));
      material.emissiveIntensity = damp(material.emissiveIntensity, active ? 1.2 : 0.4, 5, delta);
    }

    if (wireRef.current) {
      wireRef.current.rotation.y -= delta * 0.3;
      wireRef.current.rotation.x += delta * 0.12;
      wireRef.current.scale.setScalar(damp(wireRef.current.scale.x, pulse * 1.28, 6, delta));
    }
  });

  return (
    <>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial ref={coreMaterial} color="#e5e9f2" emissive="#4b5468" emissiveIntensity={0.4} roughness={0.2} metalness={0.5} transparent opacity={0.9} />
      </mesh>
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[0.5, 0]} />
        <meshBasicMaterial transparent opacity={0.22} color={STATUS_COLOR[status]} wireframe />
      </mesh>
    </>
  );
}

function SparkField({ status, quality }: { status: BuildTestStatus; quality: "high" | "low" }) {
  const handle = useRef<ParticleSystemHandle>(null);
  const count = quality === "high" ? 160 : 70;
  const seeds = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = Math.random() * Math.PI * 2;
      arr[i * 3 + 1] = 0.7 + Math.random() * 1.4;
      arr[i * 3 + 2] = Math.random();
    }
    return arr;
  }, [count]);

  useFrame((state, delta) => {
    const positions = handle.current?.positions;
    const material = handle.current?.material;
    const active = status !== "idle";
    if (material) {
      material.opacity = damp(material.opacity, active ? (status === "testing" || status === "verified" ? 0.6 : 0.35) : 0.08, 4, delta);
      material.color.set(STATUS_COLOR[status]);
    }
    if (!positions) return;
    const speed = status === "testing" ? 0.6 : 0.25;
    for (let i = 0; i < count; i += 1) {
      const angle = seeds[i * 3] ?? 0;
      const radius = seeds[i * 3 + 1] ?? 1;
      const phase = seeds[i * 3 + 2] ?? 0;
      const orbit = angle + state.clock.elapsedTime * speed * (0.4 + phase);
      const base = i * 3;
      positions[base] = Math.cos(orbit) * radius;
      positions[base + 1] = Math.sin(state.clock.elapsedTime * 0.5 + phase * 6) * 0.6;
      positions[base + 2] = Math.sin(orbit) * radius * 0.6;
    }
    const attribute = handle.current?.points?.geometry.attributes.position as BufferAttribute | undefined;
    if (attribute) attribute.needsUpdate = true;
  });

  return <ParticleSystem ref={handle} count={count} size={0.02} color="#4b5468" opacity={0.08} additive />;
}

export interface DevCoreSceneProps {
  status: BuildTestStatus;
  quality: "high" | "low";
}

export function DevCoreScene({ status, quality }: DevCoreSceneProps) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[2, 2, 3]} intensity={1} color={STATUS_COLOR[status]} />
      <pointLight position={[-2, -1, 2]} intensity={0.4} color="#22d3ee" />
      <AnalysisCore status={status} />
      <SparkField status={status} quality={quality} />
    </>
  );
}
