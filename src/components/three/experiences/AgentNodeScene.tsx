"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { damp } from "@/lib/motion/mathUtils";
import { percentToWorld } from "@/lib/three/layout";
import type { AgentId } from "@/types";

/**
 * Decorative R3F visuals for experience 1/4 ("Choose Your AI Agent", see
 * components/game/AgentSelectExperience.tsx). Lives under
 * `components/three/**` for that directory's imperative-mutation lint
 * carve-out (see eslint.config.mjs) — same "3D decorates, HTML carries the
 * interaction" split used by every other chapter scene.
 */

export interface AgentNodeLayout {
  id: AgentId;
  xPercent: number;
  yPercent: number;
}

const neutralColor = new Color("#8b93a8");

/** Slow idle drift, biased toward whichever agent node is currently
 * hovered/selected — a light "camera/focus shift toward it" cue (per the
 * brief) layered on top of the permanent idle motion, rather than a hard cut. */
function DriftCamera({ focus }: { focus: [number, number, number] | null }) {
  const camera = useThree((state) => state.camera);
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const driftX = Math.sin(t * 0.12) * 0.4;
    const driftY = 0.15 + Math.cos(t * 0.1) * 0.15;
    const targetX = driftX + (focus ? focus[0] * 0.18 : 0);
    const targetY = driftY + (focus ? focus[1] * 0.12 : 0);
    camera.position.x = damp(camera.position.x, targetX, 4, delta);
    camera.position.y = damp(camera.position.y, targetY, 4, delta);
    const lookX = focus ? focus[0] * 0.12 : 0;
    const lookY = focus ? focus[1] * 0.08 : 0;
    camera.lookAt(lookX, lookY, 0);
  });
  return null;
}

function CentralHub({ active }: { active: boolean }) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;
    mesh.rotation.y += delta * 0.25;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * (active ? 2.4 : 1.1)) * (active ? 0.08 : 0.04);
    mesh.scale.setScalar(damp(mesh.scale.x, pulse, 6, delta));
    material.emissiveIntensity = damp(material.emissiveIntensity, active ? 1.3 : 0.7, 5, delta);
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[0.42, 2]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#e5e9f2"
        emissive="#fd6a50"
        emissiveIntensity={0.7}
        roughness={0.2}
        metalness={0.5}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

function AgentNodeMesh({
  layout,
  color,
  status,
  seed,
}: {
  layout: AgentNodeLayout;
  color: Color;
  status: "idle" | "hovered" | "selected";
  seed: number;
}) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);
  const position = useMemo(() => percentToWorld(layout.xPercent, layout.yPercent, 0), [layout]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 1.8 + seed) * (status === "idle" ? 0.06 : 0.12);
    const targetScale = status === "selected" ? pulse * 1.25 : status === "hovered" ? pulse * 1.1 : pulse;
    mesh.scale.setScalar(damp(mesh.scale.x, targetScale, 6, delta));
    mesh.rotation.x += delta * 0.3;
    mesh.rotation.y += delta * 0.22;

    const tint = status === "idle" ? neutralColor : color;
    material.color.lerp(tint, 1 - Math.exp(-6 * delta));
    material.emissive.lerp(tint, 1 - Math.exp(-6 * delta));
    material.emissiveIntensity = damp(material.emissiveIntensity, status === "idle" ? 0.5 : status === "hovered" ? 0.9 : 1.4, 6, delta);
  });

  return (
    <mesh ref={meshRef} position={position}>
      <octahedronGeometry args={[0.2, 0]} />
      <meshStandardMaterial ref={materialRef} transparent opacity={0.95} roughness={0.3} metalness={0.4} />
    </mesh>
  );
}

function AgentLink({ layout, active }: { layout: AgentNodeLayout; active: boolean }) {
  const positions = useMemo(() => {
    const [x, y, z] = percentToWorld(layout.xPercent, layout.yPercent, 0);
    return new Float32Array([0, 0, 0, x, y, z]);
  }, [layout]);

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial transparent opacity={active ? 0.55 : 0.16} color={active ? "#fd6a50" : "#8b93a8"} />
    </line>
  );
}

export interface AgentNodeSceneProps {
  layouts: AgentNodeLayout[];
  colors: Record<AgentId, string>;
  hoveredId: AgentId | null;
  selectedId: AgentId | null;
  quality: "high" | "low";
}

export function AgentNodeScene({ layouts, colors, hoveredId, selectedId, quality }: AgentNodeSceneProps) {
  const groupRef = useRef<Group>(null);
  const dustHandle = useRef<ParticleSystemHandle>(null);
  const initialized = useRef(false);
  const count = quality === "high" ? 220 : 100;

  const focusId = selectedId ?? hoveredId;
  const focusLayout = useMemo(() => layouts.find((layout) => layout.id === focusId) ?? null, [layouts, focusId]);
  const focusPosition = useMemo(
    () => (focusLayout ? percentToWorld(focusLayout.xPercent, focusLayout.yPercent, 0) : null),
    [focusLayout]
  );

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.008;

    if (!initialized.current) {
      const positions = dustHandle.current?.positions;
      if (positions) {
        const pointCount = positions.length / 3;
        for (let i = 0; i < pointCount; i += 1) {
          positions[i * 3] = (Math.random() - 0.5) * 6.5;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 3.6;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 2.4 - 0.6;
        }
        const attribute = dustHandle.current?.points?.geometry.attributes.position;
        if (attribute) (attribute as { needsUpdate: boolean }).needsUpdate = true;
        initialized.current = true;
      }
    }
    if (dustHandle.current?.material) dustHandle.current.material.opacity = 0.3;
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[2, 2, 3]} intensity={1.1} color="#fd6a50" />
      <pointLight position={[-2, -1, 2]} intensity={0.45} color="#22d3ee" />
      <DriftCamera focus={focusPosition} />
      <group ref={groupRef}>
        <ParticleSystem ref={dustHandle} count={count} size={0.018} color="#c7cfe0" opacity={0.3} additive />
        <CentralHub active={selectedId !== null} />
        {layouts.map((layout) => (
          <AgentLink key={`link-${layout.id}`} layout={layout} active={layout.id === selectedId || layout.id === hoveredId} />
        ))}
        {layouts.map((layout, index) => {
          const status = layout.id === selectedId ? "selected" : layout.id === hoveredId ? "hovered" : "idle";
          const color = new Color(colors[layout.id]);
          return <AgentNodeMesh key={layout.id} layout={layout} color={color} status={status} seed={index * 1.9} />;
        })}
      </group>
    </>
  );
}
