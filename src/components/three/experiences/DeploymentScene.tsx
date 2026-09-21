"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type BufferAttribute, type Mesh, type MeshStandardMaterial } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { WorkflowPipelineScene } from "@/components/three/experiences/WorkflowPipelineScene";
import { damp, lerp } from "@/lib/motion/mathUtils";

/**
 * Decorative R3F visuals for experience 4/4 ("Review & Ship", see
 * components/game/ReviewShipExperience.tsx). Reuses `WorkflowPipelineScene`
 * fully-lit (every real stage already completed) and adds a final deployment
 * beacon beyond the chain that ignites — and draws converging particles —
 * once review/shipping is confirmed. Lives under `components/three/**` for
 * the imperative-mutation lint carve-out (see eslint.config.mjs).
 */

const readyColor = new Color("#34d399");
const idleColor = new Color("#4b5468");

function DeploymentBeacon({ ready }: { ready: boolean }) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * (ready ? 2.6 : 1)) * (ready ? 0.16 : 0.03);
    mesh.scale.setScalar(damp(mesh.scale.x, ready ? pulse : pulse * 0.7, 5, delta));
    mesh.rotation.y += delta * (ready ? 0.6 : 0.15);
    const tint = ready ? readyColor : idleColor;
    material.color.lerp(tint, 1 - Math.exp(-4 * delta));
    material.emissive.lerp(tint, 1 - Math.exp(-4 * delta));
    material.emissiveIntensity = damp(material.emissiveIntensity, ready ? 1.6 : 0.3, 5, delta);
  });

  return (
    <mesh ref={meshRef} position={[3.4, 0, 0]}>
      <dodecahedronGeometry args={[0.26, 0]} />
      <meshStandardMaterial ref={materialRef} transparent opacity={0.95} roughness={0.2} metalness={0.5} />
    </mesh>
  );
}

function ConvergingParticles({ ready, quality }: { ready: boolean; quality: "high" | "low" }) {
  const handle = useRef<ParticleSystemHandle>(null);
  const count = quality === "high" ? 80 : 36;
  const seeds = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i += 1) arr[i] = Math.random();
    return arr;
  }, [count]);

  useFrame((state, delta) => {
    const positions = handle.current?.positions;
    const material = handle.current?.material;
    if (material) material.opacity = damp(material.opacity, ready ? 0.75 : 0, 4, delta);
    if (!positions) return;
    for (let i = 0; i < count; i += 1) {
      const t = ((seeds[i] ?? 0) + state.clock.elapsedTime * 0.4) % 1;
      const base = i * 3;
      const startX = -2.8 + ((seeds[i] ?? 0) - 0.5) * 5.2;
      const startY = ((seeds[i] ?? 0) - 0.5) * 2.4;
      positions[base] = lerp(startX, 3.4, t);
      positions[base + 1] = lerp(startY, 0, t);
      positions[base + 2] = lerp(0, 0, t);
    }
    const attribute = handle.current?.points?.geometry.attributes.position as BufferAttribute | undefined;
    if (attribute) attribute.needsUpdate = true;
  });

  return <ParticleSystem ref={handle} count={count} size={0.026} color="#34d399" opacity={0} additive />;
}

export interface DeploymentSceneProps {
  totalStages: number;
  /** True once implementation + tests + review are all confirmed complete. */
  ready: boolean;
  quality: "high" | "low";
}

export function DeploymentScene({ totalStages, ready, quality }: DeploymentSceneProps) {
  return (
    <>
      <WorkflowPipelineScene totalStages={totalStages} completedCount={totalStages} runningIndex={null} accentHex="#34d399" quality={quality} />
      <DeploymentBeacon ready={ready} />
      <ConvergingParticles ready={ready} quality={quality} />
    </>
  );
}
