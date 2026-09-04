"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, type BufferAttribute, type Group, type LineBasicMaterial, type Mesh, type MeshStandardMaterial } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { damp } from "@/lib/motion/mathUtils";
import { percentToWorld } from "@/lib/three/layout";
import { edgeVisual, nodeVisual, type EdgeVisual, type NodeVisual, type PathNode } from "@/components/game/NeuralPathGame.types";

/**
 * Decorative R3F visuals for mini-game 3/4 ("Neural Path", see
 * components/game/NeuralPathGame.tsx). Lives under `components/three/**`
 * (rather than alongside the DOM game logic) so it shares that directory's
 * lint carve-out for imperative `useFrame` mutation of `camera`/mesh/material
 * — see eslint.config.mjs.
 */

function DriftCamera() {
  const camera = useThree((state) => state.camera);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    camera.position.y = 0.05 + Math.sin(t * 0.2) * 0.15;
    camera.position.z = 4.2 + Math.cos(t * 0.1) * 0.15;
    camera.lookAt(0.4, 0, -0.6);
  });
  return null;
}

const lockedColor = new Color("#4b5673");
const availableColor = new Color("#a78bfa");
const activeColor = new Color("#34d399");
const flashColor = new Color("#fb7185");
const dormantColor = new Color("#2a3350");

function PathNodeMesh({ node, visual, seed }: { node: PathNode; visual: NodeVisual; seed: number }) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);
  const position = useMemo(() => percentToWorld(node.xPercent, node.yPercent, 0, 3.4, 1.7), [node]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;
    const t = state.clock.elapsedTime;
    const pulse = visual === "available" ? 1 + Math.sin(t * 3 + seed) * 0.12 : 1;
    const targetScale = visual === "locked" ? 0.55 : visual === "active-path" ? 1.15 : visual === "flash" ? 1.3 : pulse;
    mesh.scale.setScalar(damp(mesh.scale.x, targetScale, 7, delta));
    mesh.rotation.y += delta * (visual === "available" ? 0.6 : 0.15);

    const tint =
      visual === "flash"
        ? flashColor
        : visual === "active-path"
          ? activeColor
          : visual === "available"
            ? availableColor
            : visual === "dormant"
              ? dormantColor
              : lockedColor;
    material.emissive.lerp(tint, 1 - Math.exp(-9 * delta));
    material.emissiveIntensity = damp(
      material.emissiveIntensity,
      visual === "locked" ? 0.25 : visual === "dormant" ? 0.35 : visual === "flash" ? 1.6 : 0.9,
      6,
      delta
    );
    material.opacity = damp(material.opacity, visual === "locked" ? 0.4 : 0.95, 6, delta);
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.15, 20, 20]} />
      <meshStandardMaterial
        ref={materialRef}
        transparent
        opacity={0.4}
        color="#0b0f1a"
        emissive="#4b5673"
        emissiveIntensity={0.25}
        roughness={0.25}
        metalness={0.5}
      />
    </mesh>
  );
}

function PathEdge({ from, to, visual }: { from: PathNode; to: PathNode; visual: EdgeVisual }) {
  const materialRef = useRef<LineBasicMaterial>(null);
  const positions = useMemo(() => {
    const [ax, ay, az] = percentToWorld(from.xPercent, from.yPercent, 0, 3.4, 1.7);
    const [bx, by, bz] = percentToWorld(to.xPercent, to.yPercent, 0, 3.4, 1.7);
    return new Float32Array([ax, ay, az, bx, by, bz]);
  }, [from, to]);

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const targetOpacity = visual === "active-path" ? 0.75 : visual === "available" ? 0.35 : visual === "dormant" ? 0.05 : 0.04;
    material.opacity = damp(material.opacity, targetOpacity, 6, delta);
    const tint = visual === "active-path" ? activeColor : visual === "available" ? availableColor : lockedColor;
    material.color.lerp(tint, 1 - Math.exp(-6 * delta));
  });

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial ref={materialRef} transparent opacity={0.04} color="#4b5673" />
    </line>
  );
}

export interface NeuralPathSceneProps {
  nodes: PathNode[];
  currentLayer: number;
  flashId: string | null;
  quality: "high" | "low";
}

export function NeuralPathScene({ nodes, currentLayer, flashId, quality }: NeuralPathSceneProps) {
  const groupRef = useRef<Group>(null);
  const dustHandle = useRef<ParticleSystemHandle>(null);
  const initialized = useRef(false);
  const count = quality === "high" ? 220 : 100;

  const layerCount = useMemo(() => nodes.reduce((max, node) => Math.max(max, node.layer), 0) + 1, [nodes]);

  const edges = useMemo(() => {
    const pairs: { from: PathNode; to: PathNode }[] = [];
    for (let layer = 0; layer < layerCount - 1; layer += 1) {
      const fromNodes = nodes.filter((node) => node.layer === layer);
      const toNodes = nodes.filter((node) => node.layer === layer + 1);
      fromNodes.forEach((from) => {
        toNodes.forEach((to) => {
          pairs.push({ from, to });
        });
      });
    }
    return pairs;
  }, [nodes, layerCount]);

  useFrame((state, delta) => {
    if (groupRef.current) groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;

    if (!initialized.current) {
      const positions = dustHandle.current?.positions;
      if (positions) {
        const pointCount = positions.length / 3;
        for (let i = 0; i < pointCount; i += 1) {
          positions[i * 3] = (Math.random() - 0.5) * 8;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 3;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 3 - 1.4;
        }
        const attribute = dustHandle.current?.points?.geometry.attributes.position as BufferAttribute | undefined;
        if (attribute) attribute.needsUpdate = true;
        initialized.current = true;
      }
    }
    const material = dustHandle.current?.material;
    if (material) material.opacity = damp(material.opacity, 0.28, 4, delta);
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[1, 2, 3]} intensity={1} color="#a78bfa" />
      <pointLight position={[-2, -1, 2]} intensity={0.5} color="#34d399" />
      <DriftCamera />
      <group ref={groupRef} position={[-0.4, 0, -1]}>
        <ParticleSystem ref={dustHandle} count={count} size={0.018} color="#a78bfa" opacity={0.28} additive />
        {edges.map(({ from, to }, index) => (
          <PathEdge key={`edge-${from.id}-${to.id}-${index}`} from={from} to={to} visual={edgeVisual(from, to, currentLayer)} />
        ))}
        {nodes.map((node, index) => (
          <PathNodeMesh key={node.id} node={node} visual={nodeVisual(node, currentLayer, flashId)} seed={index * 1.3} />
        ))}
      </group>
    </>
  );
}
