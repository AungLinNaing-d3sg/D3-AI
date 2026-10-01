"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, type BufferAttribute, type Group, type Mesh, type MeshStandardMaterial, Vector3 } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { damp, lerp } from "@/lib/motion/mathUtils";

/**
 * Decorative R3F visuals for experience 2/4 ("Run the AI Workflow", see
 * components/game/WorkflowRunExperience.tsx). A chain of stage nodes along a
 * gentle arc; nodes light up as each real `ai_workflow.sh` stage completes,
 * and energy motes travel along completed segments — a real visualisation of
 * pipeline progress, not decoration for its own sake. Lives under
 * `components/three/**` for the imperative-mutation lint carve-out (see
 * eslint.config.mjs).
 */

function DriftCamera() {
  const camera = useThree((state) => state.camera);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    camera.position.y = 0.2 + Math.sin(t * 0.1) * 0.1;
    camera.lookAt(0, -0.1, 0);
  });
  return null;
}

function stageWorldPosition(index: number, total: number): [number, number, number] {
  const t = total <= 1 ? 0.5 : index / (total - 1);
  const x = (t - 0.5) * 5.6;
  const y = Math.sin(t * Math.PI) * 0.55 - 0.15;
  const z = Math.cos(t * Math.PI * 0.6) * 0.3;
  return [x, y, z];
}

const completeColor = new Color("#34d399");
const idleColor = new Color("#4b5468");

function StageNode({
  index,
  total,
  status,
  accent,
}: {
  index: number;
  total: number;
  status: "pending" | "running" | "done";
  accent: Color;
}) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);
  const position = useMemo(() => stageWorldPosition(index, total), [index, total]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;
    const pulse = status === "running" ? 1 + Math.sin(state.clock.elapsedTime * 5) * 0.22 : 1;
    mesh.scale.setScalar(damp(mesh.scale.x, pulse, 8, delta));
    mesh.rotation.y += delta * (status === "running" ? 1.4 : 0.3);

    const tint = status === "done" ? completeColor : status === "running" ? accent : idleColor;
    material.color.lerp(tint, 1 - Math.exp(-6 * delta));
    material.emissive.lerp(tint, 1 - Math.exp(-6 * delta));
    material.emissiveIntensity = damp(material.emissiveIntensity, status === "pending" ? 0.25 : status === "running" ? 1.5 : 0.9, 6, delta);
  });

  return (
    <mesh ref={meshRef} position={position}>
      <icosahedronGeometry args={[0.16, 1]} />
      <meshStandardMaterial ref={materialRef} transparent opacity={0.95} roughness={0.25} metalness={0.45} />
    </mesh>
  );
}

export interface WorkflowPipelineSceneProps {
  totalStages: number;
  /** Number of stages fully completed, 0..totalStages. */
  completedCount: number;
  /** 0-based index of the currently running stage, or null when idle/finished. */
  runningIndex: number | null;
  accentHex: string;
  quality: "high" | "low";
}

export function WorkflowPipelineScene({ totalStages, completedCount, runningIndex, accentHex, quality }: WorkflowPipelineSceneProps) {
  const groupRef = useRef<Group>(null);
  const motesHandle = useRef<ParticleSystemHandle>(null);
  const accent = useMemo(() => new Color(accentHex), [accentHex]);
  const moteCount = quality === "high" ? 36 : 16;

  const motePhases = useMemo(() => {
    const phases = new Float32Array(moteCount);
    const lanes = new Float32Array(moteCount);
    for (let i = 0; i < moteCount; i += 1) {
      phases[i] = Math.random();
      lanes[i] = Math.floor(Math.random() * Math.max(totalStages - 1, 1));
    }
    return { phases, lanes };
  }, [moteCount, totalStages]);

  useFrame((state, delta) => {
    if (groupRef.current) groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.05) * 0.05;

    const positions = motesHandle.current?.positions;
    const material = motesHandle.current?.material;
    if (material) material.opacity = damp(material.opacity, completedCount > 1 ? 0.85 : 0, 4, delta);
    if (positions) {
      const activeSegments = Math.max(completedCount - 1, 0);
      for (let i = 0; i < moteCount; i += 1) {
        const lane = Math.floor(motePhases.lanes[i] ?? 0) % Math.max(totalStages - 1, 1);
        const base = i * 3;
        if (lane >= activeSegments) {
          positions[base] = 999;
          positions[base + 1] = 999;
          positions[base + 2] = 999;
          continue;
        }
        const speed = 0.35;
        const t = ((motePhases.phases[i] ?? 0) + state.clock.elapsedTime * speed) % 1;
        const [x1, y1, z1] = stageWorldPosition(lane, totalStages);
        const [x2, y2, z2] = stageWorldPosition(lane + 1, totalStages);
        positions[base] = lerp(x1, x2, t);
        positions[base + 1] = lerp(y1, y2, t) + 0.05;
        positions[base + 2] = lerp(z1, z2, t);
      }
      const attribute = motesHandle.current?.points?.geometry.attributes.position as BufferAttribute | undefined;
      if (attribute) attribute.needsUpdate = true;
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 2, 3]} intensity={1} color={accentHex} />
      <pointLight position={[-2, -1, 2]} intensity={0.4} color="#34d399" />
      <DriftCamera />
      <group ref={groupRef}>
        <ParticleSystem ref={motesHandle} count={moteCount} size={0.03} color={accentHex} opacity={0} additive />
        <StageChainLines totalStages={totalStages} completedCount={completedCount} accent={accent} />
        {Array.from({ length: totalStages }, (_, index) => {
          const status: "pending" | "running" | "done" = index < completedCount ? "done" : index === runningIndex ? "running" : "pending";
          return <StageNode key={index} index={index} total={totalStages} status={status} accent={accent} />;
        })}
      </group>
    </>
  );
}

function StageChainLines({ totalStages, completedCount, accent }: { totalStages: number; completedCount: number; accent: Color }) {
  const segments = useMemo(() => {
    const list: { positions: Float32Array; index: number }[] = [];
    for (let i = 0; i < totalStages - 1; i += 1) {
      const from = new Vector3(...stageWorldPosition(i, totalStages));
      const to = new Vector3(...stageWorldPosition(i + 1, totalStages));
      list.push({ positions: new Float32Array([from.x, from.y, from.z, to.x, to.y, to.z]), index: i });
    }
    return list;
  }, [totalStages]);

  return (
    <>
      {segments.map((segment) => (
        <line key={segment.index}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[segment.positions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            transparent
            opacity={segment.index < completedCount - 1 ? 0.6 : 0.15}
            color={segment.index < completedCount - 1 ? accent : "#4b5468"}
          />
        </line>
      ))}
    </>
  );
}
