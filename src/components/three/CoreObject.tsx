"use client";

import { useRef, type ElementRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import { MathUtils, type Mesh } from "three";
import { sceneState } from "@/lib/motion/sceneState";

/**
 * The "AI core" — an abstract distorted icosahedron standing in for the
 * company's technology/data identity. Deliberately abstract rather than a
 * literal 3D model, since no brand-approved 3D assets exist in /docs.
 * Scale, distortion, rotation speed and colour are all scroll-driven via
 * `sceneState`.
 */
export function CoreObject() {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ElementRef<typeof MeshDistortMaterial>>(null);

  useFrame((_, delta) => {
    const { core } = sceneState;
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;

    mesh.rotation.y += delta * core.rotationSpeed;
    mesh.rotation.x += delta * core.rotationSpeed * 0.35;

    mesh.scale.setScalar(MathUtils.lerp(mesh.scale.x, core.scale, 0.08));

    material.distort = core.distort;
    material.color.setRGB(core.color.r, core.color.g, core.color.b);
    material.emissive.setRGB(core.color.r * 0.4, core.color.g * 0.4, core.color.b * 0.4);
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.4, 6]} />
      <MeshDistortMaterial
        ref={materialRef}
        roughness={0.15}
        metalness={0.4}
        speed={1.4}
        emissiveIntensity={0.6}
      />
    </mesh>
  );
}
