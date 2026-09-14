"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { BufferAttribute, Group, LineBasicMaterial, Mesh, MeshBasicMaterial, MeshStandardMaterial } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { clamp, damp, smoothstep } from "@/lib/motion/mathUtils";
import { technologyNetworkNodes } from "@/data/journey";
import { SCENE_TIER_CONFIG, tieredParticleCount, type SceneQuality } from "@/lib/three/deviceTiers";

interface NeuralSceneProps {
  quality: SceneQuality;
}

/** Base (desktop) world-space scale for every node/spoke position below,
 * multiplied by the device tier's `objectScale` (see
 * `src/lib/three/deviceTiers.ts`) so the whole graph — not just the canvas —
 * shrinks on tablet/mobile instead of merely being viewed from further away. */
const BASE_SCENE_SCALE = 1.7;

/** Matches the radius `technologyNetworkNodes` are laid out on (see
 * `journey.ts`) — the widest extent in this composition, and so the one the
 * mobile/tablet frustum-fit correction below reasons about. */
const NETWORK_RING_RADIUS = 2.6;

/** Fraction of the currently-visible frustum width the whole graph may
 * occupy on tablet/mobile — a portrait phone's much narrower horizontal FOV
 * (a function of aspect ratio, not just device tier) can otherwise clip the
 * outer nodes even after `objectScale`. */
const MOBILE_FIT_MARGIN = 0.92;

/** How many small "query" particles pulse from the central hub out to a
 * technology node and back — tiered down for mobile/tablet, skipped on the
 * lowest tier entirely. */
const TRAVELER_COUNT: Record<SceneQuality, number> = { high: 4, medium: 2, low: 0 };

/**
 * Chapter 04 — Neural Network / technology ecosystem. The typography
 * particles (chapter 03) dissolve into the real technology stack
 * (src/data/technology.ts, `technologyNetworkNodes`) arranged as its own
 * standalone network around a central hub — this chapter no longer carries
 * the THINK/LEARN/UNDERSTAND/PREDICT/CREATE pipeline (that now lives
 * exclusively in the hero, see three/scenes/IntroScene.tsx); every node here
 * is a real piece of the delivery stack, spoked directly to the hub rather
 * than to a "nearest concept". Small glowing particles pulse from the hub out
 * to a node and back — reading as the network being actively queried/served
 * — and an ambient "synapse dust" field gives it depth. The whole graph tilts
 * toward the pointer, and the hub itself brightens subtly the closer the
 * pointer sits to centre.
 */
export function NeuralScene({ quality }: NeuralSceneProps) {
  const groupRef = useRef<Group>(null);
  const hubRef = useRef<Mesh>(null);
  const hubWireRef = useRef<Mesh>(null);
  const hubGlowRef = useRef<Mesh>(null);
  const dustHandle = useRef<ParticleSystemHandle>(null);
  const dustInitialized = useRef(false);
  const nodeMeshRefs = useRef<Mesh[]>([]);
  const spokeMaterialRefs = useRef<LineBasicMaterial[]>([]);
  const travelerRefs = useRef<Mesh[]>([]);
  const tilt = useRef({ x: 0, y: 0 });
  const fitScale = useRef(1);

  const dustCount = tieredParticleCount(900, quality);
  const sceneScale = BASE_SCENE_SCALE * SCENE_TIER_CONFIG[quality].objectScale;
  const travelerCount = TRAVELER_COUNT[quality];
  const nodeCount = technologyNetworkNodes.length;

  const spokePositions = useMemo(
    () =>
      technologyNetworkNodes.map(
        (node) =>
          new Float32Array([
            0,
            0,
            0,
            node.position[0] * sceneScale,
            node.position[1] * sceneScale,
            node.position[2] * sceneScale,
          ])
      ),
    [sceneScale]
  );

  useFrame((state, delta) => {
    const weight = journeyState.weight.neural;
    const progress = journeyState.progress.neural;
    const group = groupRef.current;
    const time = state.clock.elapsedTime;
    const pointer = journeyState.pointer;
    const pointerEnergy = clamp(1 - Math.hypot(pointer.x, pointer.y) * 0.5, 0.5, 1);

    if (group) {
      group.visible = weight > 0.001;
      tilt.current.x = damp(tilt.current.x, pointer.y * 0.12, 3, delta);
      tilt.current.y = damp(tilt.current.y, pointer.x * 0.16, 3, delta);
      group.rotation.x = tilt.current.x;
      group.rotation.y = tilt.current.y + time * 0.02;

      // A portrait phone's much narrower horizontal FOV (a function of
      // aspect ratio, not just device tier) can still clip the outer nodes
      // even after `objectScale` — so, only below the desktop tier (desktop
      // keeps its exact authored scale, untouched), keep re-fitting the
      // whole graph to whatever width is actually visible right now, on top
      // of (never beyond) the tier's own scale.
      let targetFit = 1;
      if (quality !== "high") {
        const viewport = state.viewport.getCurrentViewport(state.camera, [0, 0, 0], state.size);
        const graphWorldWidth = NETWORK_RING_RADIUS * sceneScale * 2;
        targetFit = Math.min(1, (viewport.width * MOBILE_FIT_MARGIN) / graphWorldWidth);
      }
      fitScale.current = damp(fitScale.current, Math.max(targetFit, 0.001), 4, delta);
      group.scale.setScalar(fitScale.current);
    }

    if (!dustInitialized.current) {
      const positions = dustHandle.current?.positions;
      if (positions) {
        const pointCount = positions.length / 3;
        for (let i = 0; i < pointCount; i += 1) {
          const radius = 1 + Math.random() * 3.4;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta) * sceneScale;
          positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * sceneScale * 0.6;
          positions[i * 3 + 2] = radius * Math.cos(phi) * sceneScale;
        }
        const attribute = dustHandle.current?.points?.geometry.attributes.position as
          | BufferAttribute
          | undefined;
        if (attribute) attribute.needsUpdate = true;
        dustInitialized.current = true;
      }
    }

    const dustMaterial = dustHandle.current?.material;
    if (dustMaterial) dustMaterial.opacity = damp(dustMaterial.opacity, 0.35 * weight, 4, delta);

    const appearValues = technologyNetworkNodes.map((_, i) => smoothstep(i * 0.055, i * 0.055 + 0.2, progress));
    let appearAverage = 0;

    nodeMeshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const appear = appearValues[i] ?? 0;
      appearAverage += appear;
      const targetScale = 0.4 + appear * 0.7;
      mesh.scale.setScalar(damp(mesh.scale.x, targetScale, 6, delta));
      const material = mesh.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, appear * weight, 5, delta);
      material.emissiveIntensity = damp(material.emissiveIntensity, 0.6 + appear * 0.8, 5, delta);
    });
    appearAverage /= Math.max(nodeCount, 1);

    spokeMaterialRefs.current.forEach((material, i) => {
      if (!material) return;
      const appear = appearValues[i] ?? 0;
      material.opacity = damp(material.opacity, appear * weight * 0.5, 5, delta);
    });

    // Query particles: pulse from the hub out to a node and back, only once
    // that node has substantially appeared — the network being actively
    // used, not just a static diagram.
    travelerRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const targetIndex = i % nodeCount;
      const targetNode = technologyNetworkNodes[targetIndex];
      if (!targetNode) return;
      const speed = 0.5 + i * 0.09;
      const cycle = (time * speed + i * 0.6) % 2;
      const pingPong = cycle < 1 ? cycle : 2 - cycle;
      mesh.position.set(
        targetNode.position[0] * sceneScale * pingPong,
        targetNode.position[1] * sceneScale * pingPong,
        targetNode.position[2] * sceneScale * pingPong
      );
      const material = mesh.material as MeshBasicMaterial;
      const nodeAppear = appearValues[targetIndex] ?? 0;
      material.opacity = damp(material.opacity, nodeAppear * weight * 0.85, 5, delta);
    });

    const idlePulse = 1 + Math.sin(time * 0.5) * 0.05;
    const hubPulse = idlePulse * (0.9 + appearAverage * 0.3) * pointerEnergy;
    if (hubRef.current) {
      const material = hubRef.current.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, 0.6 * weight, 4, delta);
      material.emissiveIntensity = damp(material.emissiveIntensity, 0.55 * pointerEnergy, 4, delta);
      hubRef.current.rotation.y += delta * 0.09;
      hubRef.current.scale.setScalar(damp(hubRef.current.scale.x, hubPulse, 4, delta));
    }
    if (hubWireRef.current) {
      const material = hubWireRef.current.material as MeshBasicMaterial;
      material.opacity = damp(material.opacity, 0.3 * weight, 4, delta);
      hubWireRef.current.rotation.y -= delta * 0.05;
      hubWireRef.current.scale.setScalar(damp(hubWireRef.current.scale.x, hubPulse * 1.22, 4, delta));
    }
    if (hubGlowRef.current) {
      const material = hubGlowRef.current.material as MeshBasicMaterial;
      material.opacity = damp(material.opacity, 0.15 * weight, 3, delta);
      hubGlowRef.current.scale.setScalar(damp(hubGlowRef.current.scale.x, hubPulse * 1.9, 3, delta));
    }
  });

  return (
    <group ref={groupRef}>
      <ParticleSystem ref={dustHandle} count={dustCount} size={0.02} color="#67e8f9" opacity={0} additive />

      {/* Central network hub every technology node spokes to — a cyan/blue
          "connected platform" identity, distinct from the hero's warm
          pipeline core. */}
      <mesh ref={hubGlowRef}>
        <icosahedronGeometry args={[0.3, 1]} />
        <meshBasicMaterial transparent opacity={0} color="#22d3ee" depthWrite={false} />
      </mesh>
      <mesh ref={hubRef}>
        <icosahedronGeometry args={[0.3, 2]} />
        <meshStandardMaterial
          transparent
          opacity={0}
          color="#e5e9f2"
          emissive="#22d3ee"
          emissiveIntensity={0.5}
          roughness={0.2}
          metalness={0.5}
        />
      </mesh>
      <mesh ref={hubWireRef}>
        <icosahedronGeometry args={[0.3, 1]} />
        <meshBasicMaterial transparent opacity={0} color="#67e8f9" wireframe />
      </mesh>

      {technologyNetworkNodes.map((node, index) => (
        <mesh
          key={node.id}
          position={[node.position[0] * sceneScale, node.position[1] * sceneScale, node.position[2] * sceneScale]}
          ref={(mesh) => {
            if (mesh) nodeMeshRefs.current[index] = mesh;
          }}
        >
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial
            transparent
            opacity={0}
            color="#67e8f9"
            emissive="#22d3ee"
            emissiveIntensity={0.6}
            roughness={0.25}
            metalness={0.5}
          />
        </mesh>
      ))}

      {spokePositions.map((positions, i) => (
        <line key={`spoke-${technologyNetworkNodes[i]?.id ?? i}`}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            transparent
            opacity={0}
            color="#9aa6c2"
            ref={(material) => {
              if (material) spokeMaterialRefs.current[i] = material;
            }}
          />
        </line>
      ))}

      {Array.from({ length: travelerCount }, (_, index) => (
        <mesh
          key={`neural-query-${index}`}
          ref={(mesh) => {
            if (mesh) travelerRefs.current[index] = mesh;
          }}
        >
          <sphereGeometry args={[0.04, 10, 10]} />
          <meshBasicMaterial transparent opacity={0} color="#a5f3fc" />
        </mesh>
      ))}
    </group>
  );
}
