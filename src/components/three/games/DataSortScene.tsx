"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, Vector3, type BufferAttribute, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { damp } from "@/lib/motion/mathUtils";
import { percentToWorld } from "@/lib/three/layout";
import type { DataObject, ObjectStatus, ZoneMarker } from "@/components/game/DataSortGame.types";

/**
 * Decorative R3F visuals for mini-game 4/4 ("Data Sort", see
 * components/game/DataSortGame.tsx). Lives under `components/three/**`
 * (rather than alongside the DOM game logic) so it shares that directory's
 * lint carve-out for imperative `useFrame` mutation of `camera`/mesh/material
 * — see eslint.config.mjs.
 */

function DriftCamera() {
  const camera = useThree((state) => state.camera);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    camera.position.x = Math.sin(t * 0.12) * 0.4;
    camera.position.y = 0.15 + Math.sin(t * 0.09) * 0.1;
    camera.lookAt(0, -0.1, 0);
  });
  return null;
}

const kindColors: Record<DataObject["kind"], Color> = {
  data: new Color("#22d3ee"),
  knowledge: new Color("#34d399"),
  signal: new Color("#fbbf24"),
  noise: new Color("#94a3b8"),
  error: new Color("#fb7185"),
};
const selectedColor = new Color("#ffffff");
const flashColor = new Color("#fb7185");

function ObjectMesh({
  object,
  status,
  zoneWorld,
  seed,
}: {
  object: DataObject;
  status: ObjectStatus;
  zoneWorld: [number, number, number];
  seed: number;
}) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);
  const homePosition = useMemo(() => percentToWorld(object.xPercent, object.yPercent, object.depth), [object]);
  const zoneVector = useMemo(() => new Vector3(...zoneWorld), [zoneWorld]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;
    const t = state.clock.elapsedTime;

    if (status === "resolved") {
      mesh.position.lerp(zoneVector, 1 - Math.exp(-4 * delta));
      mesh.scale.setScalar(damp(mesh.scale.x, 0, 5, delta));
    } else {
      const wobble = status === "flash" ? Math.sin(t * 40) * 0.05 : 0;
      mesh.position.set(
        homePosition[0] + Math.cos(t * 0.6 + seed) * 0.08 + wobble,
        homePosition[1] + Math.sin(t * 0.7 + seed) * 0.08,
        homePosition[2]
      );
      const targetScale = status === "selected" ? 1.35 : status === "flash" ? 1.1 : 1;
      mesh.scale.setScalar(damp(mesh.scale.x, targetScale, 7, delta));
    }

    mesh.rotation.x += delta * (0.3 + seed * 0.05);
    mesh.rotation.y += delta * 0.25;

    const tint = status === "flash" ? flashColor : status === "selected" ? selectedColor : kindColors[object.kind];
    material.emissive.lerp(tint, 1 - Math.exp(-8 * delta));
    material.emissiveIntensity = damp(material.emissiveIntensity, status === "idle" ? 0.6 : 1.3, 6, delta);
    material.opacity = damp(material.opacity, status === "resolved" ? 0 : 0.95, 6, delta);
  });

  const geometry =
    object.kind === "data" ? (
      <boxGeometry args={[0.24, 0.24, 0.24]} />
    ) : object.kind === "knowledge" ? (
      <dodecahedronGeometry args={[0.16, 0]} />
    ) : object.kind === "signal" ? (
      <tetrahedronGeometry args={[0.18, 0]} />
    ) : object.kind === "noise" ? (
      <icosahedronGeometry args={[0.16, 0]} />
    ) : (
      <octahedronGeometry args={[0.17, 0]} />
    );

  return (
    <mesh ref={meshRef} position={homePosition}>
      {geometry}
      <meshStandardMaterial
        ref={materialRef}
        transparent
        opacity={0.95}
        color="#0b0f1a"
        emissive="#22d3ee"
        emissiveIntensity={0.6}
        roughness={0.3}
        metalness={0.4}
      />
    </mesh>
  );
}

function ZoneRing({ xPercent, yPercent, color }: { xPercent: number; yPercent: number; color: string }) {
  const ringRef = useRef<Mesh>(null);
  const position = useMemo(() => percentToWorld(xPercent, yPercent, 0), [xPercent, yPercent]);

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.4;
    }
  });

  return (
    <mesh ref={ringRef} position={position} rotation={[Math.PI / 2.4, 0, 0]}>
      <torusGeometry args={[0.32, 0.02, 12, 48]} />
      <meshBasicMaterial transparent opacity={0.55} color={color} />
    </mesh>
  );
}

export interface DataSortSceneProps {
  objects: DataObject[];
  statuses: Record<string, ObjectStatus>;
  processZone: ZoneMarker;
  discardZone: ZoneMarker;
  quality: "high" | "low";
}

export function DataSortScene({ objects, statuses, processZone, discardZone, quality }: DataSortSceneProps) {
  const groupRef = useRef<Group>(null);
  const dustHandle = useRef<ParticleSystemHandle>(null);
  const initialized = useRef(false);
  const count = quality === "high" ? 240 : 110;
  const processWorld = useMemo(
    () => percentToWorld(processZone.xPercent, processZone.yPercent, 0),
    [processZone]
  );
  const discardWorld = useMemo(
    () => percentToWorld(discardZone.xPercent, discardZone.yPercent, 0),
    [discardZone]
  );

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.005;

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
    const material = dustHandle.current?.material;
    if (material) material.opacity = damp(material.opacity, 0.3, 4, delta);
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[2, 2, 3]} intensity={1} color="#fbbf24" />
      <pointLight position={[-2, -1, 2]} intensity={0.5} color="#22d3ee" />
      <DriftCamera />
      <group ref={groupRef}>
        <ParticleSystem ref={dustHandle} count={count} size={0.02} color="#fbbf24" opacity={0.3} additive />
        <ZoneRing xPercent={processZone.xPercent} yPercent={processZone.yPercent} color="#34d399" />
        <ZoneRing xPercent={discardZone.xPercent} yPercent={discardZone.yPercent} color="#fb7185" />
        {objects.map((object, index) => (
          <ObjectMesh
            key={object.id}
            object={object}
            status={statuses[object.id] ?? "idle"}
            zoneWorld={object.positive ? processWorld : discardWorld}
            seed={index * 1.1}
          />
        ))}
      </group>
    </>
  );
}
