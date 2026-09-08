"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, type Group, type MeshStandardMaterial } from "three";
import { sceneState } from "@/lib/motion/sceneState";
import { services } from "@/data/services";

interface RingDefinition {
  /** Tilt of this ring's own orbital plane, in radians. */
  tiltX: number;
  tiltZ: number;
  radius: number;
  tube: number;
  /** Precession speed (radians/sec) around the shared vertical axis. */
  speed: number;
  /** Hex colour — reused from later chapters' palette so the rings read as
   * a preview of the story still to come (Data → hero blue, Dynamics →
   * brand orange, Digital → solutions indigo). */
  color: string;
}

const RING_DEFINITIONS: RingDefinition[] = [
  { tiltX: 0.35, tiltZ: 0.1, radius: 2.05, tube: 0.014, speed: 0.12, color: "#4a7ba6" },
  { tiltX: -0.2, tiltZ: 0.55, radius: 2.3, tube: 0.012, speed: -0.09, color: "#fd6a50" },
  { tiltX: 0.9, tiltZ: -0.25, radius: 2.55, tube: 0.011, speed: 0.16, color: "#6366f1" },
];

/**
 * The "company identity" scene for the About chapter — three tilted,
 * precessing rings around the shared core, standing in for the Data /
 * Dynamics / Digital pillars (see src/data/services.ts, mirrored in the
 * pillar list rendered by AboutSection). An abstract "armillary sphere"
 * rather than a literal 3D model, consistent with CoreObject's approach —
 * no brand-approved 3D assets exist under /docs.
 *
 * Always mounted (cheap: 3 low-poly tori) but only visible while
 * `sceneState.identity.opacity` is non-zero, which the scroll timeline
 * drives up during the About chapter and back down everywhere else (see
 * sceneKeyframes in lib/motion/sceneState.ts).
 */
export function IdentityConstellation() {
  const outerGroupRef = useRef<Group>(null);
  const tiltGroupRefs = useRef<Group[]>([]);
  const materialRefs = useRef<MeshStandardMaterial[]>([]);

  useFrame((_, delta) => {
    const { identity } = sceneState;
    const outer = outerGroupRef.current;
    if (outer) {
      outer.rotation.y += delta * 0.05;
    }

    tiltGroupRefs.current.forEach((group, i) => {
      const definition = RING_DEFINITIONS[i];
      if (!group || !definition) return;
      group.rotation.y += delta * definition.speed;
    });

    materialRefs.current.forEach((material) => {
      if (!material) return;
      material.opacity = MathUtils.lerp(material.opacity, identity.opacity, 0.08);
    });
  });

  return (
    <group ref={outerGroupRef}>
      {RING_DEFINITIONS.map((definition, i) => (
        <group
          key={services[i]?.slug ?? i}
          rotation={[definition.tiltX, 0, definition.tiltZ]}
          ref={(node) => {
            if (node) tiltGroupRefs.current[i] = node;
          }}
        >
          <mesh>
            <torusGeometry args={[definition.radius, definition.tube, 16, 96]} />
            <meshStandardMaterial
              ref={(material) => {
                if (material) materialRefs.current[i] = material;
              }}
              color={definition.color}
              emissive={definition.color}
              emissiveIntensity={0.5}
              roughness={0.3}
              metalness={0.6}
              transparent
              opacity={0}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
