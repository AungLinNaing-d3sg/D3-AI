"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, MeshStandardMaterial, Vector3, type Group, type LineBasicMaterial, type Mesh } from "three";
import { sceneState } from "@/lib/motion/sceneState";
import { techNodes } from "@/data/technology";

/**
 * Connected-node visualisation used for the Services / Solutions /
 * Technology sections — a ring of small emissive nodes around the core,
 * joined by spoke + ring lines, evoking a "technology ecosystem" graph.
 * Node count comes from the real technology list (src/data/technology.ts)
 * so the visual and the accessible text list stay in sync.
 *
 * A single unit-radius layout is computed once; scroll-driven radius comes
 * from scaling the whole group each frame, which keeps this cheap even
 * though the underlying line/point geometry never changes.
 */
export function NodeNetwork() {
  const groupRef = useRef<Group>(null);
  const nodeRefs = useRef<Mesh[]>([]);
  const spokeRefs = useRef<LineBasicMaterial[]>([]);
  const ringRefs = useRef<LineBasicMaterial[]>([]);

  const unitPositions = useMemo(() => {
    const count = techNodes.length;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      return new Vector3(Math.cos(angle), Math.sin(angle) * 0.4, Math.sin(angle));
    });
  }, []);

  const spokePairs = useMemo(
    () => unitPositions.map((point) => new Float32Array([0, 0, 0, point.x, point.y, point.z])),
    [unitPositions]
  );

  const ringPairs = useMemo(
    () =>
      unitPositions.map((point, i) => {
        const next = unitPositions[(i + 1) % unitPositions.length];
        if (!next) return new Float32Array(6);
        return new Float32Array([point.x, point.y, point.z, next.x, next.y, next.z]);
      }),
    [unitPositions]
  );

  useFrame(() => {
    const { nodes, core } = sceneState;
    const group = groupRef.current;
    if (!group) return;

    group.scale.setScalar(MathUtils.lerp(group.scale.x, nodes.radius, 0.07));

    nodeRefs.current.forEach((mesh) => {
      const material = mesh.material;
      if (!(material instanceof MeshStandardMaterial)) return;
      material.opacity = MathUtils.lerp(material.opacity, nodes.opacity, 0.1);
      material.color.setRGB(core.color.r, core.color.g, core.color.b);
      material.emissive.setRGB(core.color.r, core.color.g, core.color.b);
    });

    spokeRefs.current.forEach((material) => {
      material.opacity = MathUtils.lerp(material.opacity, nodes.lineOpacity * 0.6, 0.1);
    });

    ringRefs.current.forEach((material) => {
      material.opacity = MathUtils.lerp(material.opacity, nodes.lineOpacity, 0.1);
    });
  });

  return (
    <group ref={groupRef}>
      {unitPositions.map((point, i) => (
        <mesh
          key={techNodes[i]?.id ?? i}
          position={point}
          ref={(mesh) => {
            if (mesh) nodeRefs.current[i] = mesh;
          }}
        >
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial transparent opacity={0} roughness={0.3} metalness={0.5} />
        </mesh>
      ))}

      {spokePairs.map((positions, i) => (
        <line key={`spoke-${techNodes[i]?.id ?? i}`}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            transparent
            opacity={0}
            color="#c7cfe0"
            ref={(material) => {
              if (material) spokeRefs.current[i] = material;
            }}
          />
        </line>
      ))}

      {ringPairs.map((positions, i) => (
        <line key={`ring-${techNodes[i]?.id ?? i}`}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            transparent
            opacity={0}
            color="#fd6a50"
            ref={(material) => {
              if (material) ringRefs.current[i] = material;
            }}
          />
        </line>
      ))}
    </group>
  );
}
