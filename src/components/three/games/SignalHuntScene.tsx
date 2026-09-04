"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, type BufferAttribute, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { damp } from "@/lib/motion/mathUtils";
import { percentToWorld } from "@/lib/three/layout";
import type { NodeStatus, SignalNode } from "@/components/game/SignalHuntGame.types";

/**
 * Decorative R3F visuals for mini-game 2/4 ("AI Signal Hunt", see
 * components/game/SignalHuntGame.tsx). Lives under `components/three/**`
 * (rather than alongside the DOM game logic) so it shares that directory's
 * lint carve-out for imperative `useFrame` mutation of `camera`/mesh/material
 * — see eslint.config.mjs — the same documented, correct R3F pattern used by
 * every chapter scene, applied here to a self-contained per-game canvas
 * instead of the shared background one.
 */

/** Slow, continuous camera drift for the mini-scene — gives Signal Hunt its
 * own sense of cinematic camera movement without a full OrbitControls
 * dependency or fighting the shared journey camera in CameraRig.tsx. */
function DriftCamera() {
  const camera = useThree((state) => state.camera);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    camera.position.x = Math.sin(t * 0.15) * 0.5;
    camera.position.y = 0.1 + Math.cos(t * 0.12) * 0.2;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function CoreEmblem() {
  const meshRef = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.3;
  });
  return (
    <mesh ref={meshRef} position={[0, 0, -1.4]}>
      <icosahedronGeometry args={[0.32, 1]} />
      <meshStandardMaterial
        color="#e5e9f2"
        emissive="#22d3ee"
        emissiveIntensity={0.9}
        roughness={0.2}
        metalness={0.5}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

const correctColor = new Color("#34d399");
const incorrectColor = new Color("#fb7185");
const signalColor = new Color("#22d3ee");
const noiseColor = new Color("#fb7185");

function SignalNodeMesh({ node, status, seed }: { node: SignalNode; status: NodeStatus; seed: number }) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);
  const position = useMemo(() => percentToWorld(node.xPercent, node.yPercent, node.depth), [node]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * (node.kind === "signal" ? 2.2 : 3.4) + seed) * 0.14;
    const targetScale = status === "idle" ? pulse : 0;
    mesh.scale.setScalar(Math.max(damp(mesh.scale.x, targetScale, status === "idle" ? 8 : 5, delta), 0));

    mesh.rotation.x += delta * (node.kind === "signal" ? 0.4 : 0.9);
    mesh.rotation.z += delta * 0.2;

    const targetOpacity = status === "idle" ? 0.95 : 0.9;
    material.opacity = damp(material.opacity, targetOpacity, 6, delta);

    const tint =
      status === "correct" ? correctColor : status === "incorrect" ? incorrectColor : node.kind === "signal" ? signalColor : noiseColor;
    material.emissive.lerp(tint, 1 - Math.exp(-8 * delta));
    material.emissiveIntensity = damp(
      material.emissiveIntensity,
      status === "idle" ? (node.kind === "signal" ? 0.8 : 0.55) : 1.6,
      6,
      delta
    );
  });

  return (
    <mesh ref={meshRef} position={position}>
      {node.kind === "signal" ? <octahedronGeometry args={[0.16, 0]} /> : <tetrahedronGeometry args={[0.16, 0]} />}
      <meshStandardMaterial
        ref={materialRef}
        transparent
        opacity={0.95}
        color="#0b0f1a"
        emissive="#22d3ee"
        emissiveIntensity={0.7}
        roughness={0.3}
        metalness={0.4}
      />
    </mesh>
  );
}

function SignalLinks({ nodes, statuses }: { nodes: SignalNode[]; statuses: Record<string, NodeStatus> }) {
  const linkPositions = useMemo(
    () =>
      nodes.map((node) => {
        const [x, y, z] = percentToWorld(node.xPercent, node.yPercent, node.depth);
        return new Float32Array([0, 0, -1.4, x, y, z]);
      }),
    [nodes]
  );

  return (
    <>
      {nodes.map((node, index) => {
        const resolved = statuses[node.id] !== "idle";
        const positions = linkPositions[index] ?? new Float32Array(6);
        return (
          <line key={`link-${node.id}`}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            </bufferGeometry>
            <lineBasicMaterial transparent opacity={resolved ? 0 : 0.22} color={node.kind === "signal" ? "#22d3ee" : "#fb7185"} />
          </line>
        );
      })}
    </>
  );
}

export interface SignalHuntSceneProps {
  nodes: SignalNode[];
  statuses: Record<string, NodeStatus>;
  quality: "high" | "low";
}

export function SignalHuntScene({ nodes, statuses, quality }: SignalHuntSceneProps) {
  const groupRef = useRef<Group>(null);
  const dustHandle = useRef<ParticleSystemHandle>(null);
  const initialized = useRef(false);
  const count = quality === "high" ? 260 : 120;

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.01;

    if (!initialized.current) {
      const positions = dustHandle.current?.positions;
      if (positions) {
        const pointCount = positions.length / 3;
        for (let i = 0; i < pointCount; i += 1) {
          positions[i * 3] = (Math.random() - 0.5) * 7;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 3 - 1;
        }
        const attribute = dustHandle.current?.points?.geometry.attributes.position as BufferAttribute | undefined;
        if (attribute) attribute.needsUpdate = true;
        initialized.current = true;
      }
    }
    if (dustHandle.current?.material) dustHandle.current.material.opacity = 0.4;
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[2, 2, 3]} intensity={1.1} color="#22d3ee" />
      <pointLight position={[-2, -1, 2]} intensity={0.5} color="#fb7185" />
      <DriftCamera />
      <group ref={groupRef}>
        <ParticleSystem ref={dustHandle} count={count} size={0.02} color="#67e8f9" opacity={0.4} additive />
        <CoreEmblem />
        <SignalLinks nodes={nodes} statuses={statuses} />
        {nodes.map((node, index) => (
          <SignalNodeMesh key={node.id} node={node} status={statuses[node.id] ?? "idle"} seed={index * 1.7} />
        ))}
      </group>
    </>
  );
}
