"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { BufferAttribute, Group, LineBasicMaterial, Mesh, MeshBasicMaterial, MeshStandardMaterial } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { clamp, damp, lerp, smoothstep } from "@/lib/motion/mathUtils";
import { heroPipelineNodes } from "@/data/journey";
import { SCENE_TIER_CONFIG, tieredParticleCount, type SceneQuality } from "@/lib/three/deviceTiers";

interface IntroSceneProps {
  quality: SceneQuality;
}

const NEBULA_COLORS = ["#4a7ba6", "#f14a30", "#22d3ee"];

/** Base (desktop) world-space scale for the hero pipeline, multiplied by the
 * device tier's `objectScale` (see `src/lib/three/deviceTiers.ts`). */
const PIPELINE_SCALE = 1.15;

/** Matches the radius the pipeline nodes roughly sit within — the widest
 * extent of this composition, and so what the mobile/tablet frustum-fit
 * correction below reasons about. */
const PIPELINE_HALF_EXTENT = 1.8;

const MOBILE_FIT_MARGIN = 0.92;

/** Seconds after mount before the first pipeline node starts assembling —
 * lets the starfield/nebula read first, then the pipeline builds itself in,
 * entirely on a real-time clock rather than scroll progress: this is the
 * very first thing a visitor sees, at rest, before any scrolling happens, so
 * it must look complete on its own. */
const ENTRANCE_START_DELAY = 0.5;
const ENTRANCE_STAGGER = 0.32;
const ENTRANCE_NODE_DURATION = 0.85;

const TRAVELER_COUNT: Record<SceneQuality, number> = { high: 3, medium: 2, low: 0 };

function randomUnitVector(): [number, number, number] {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return [Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi)];
}

/**
 * Chapter 01 — Cinematic AI Intro. A deep starfield plus three soft,
 * slow-drifting "nebula" spheres carry the atmospheric backdrop, in front of
 * which the site's signature moment now lives: a pulsing central AI core
 * that the five pipeline stages — THINK, LEARN, UNDERSTAND, PREDICT, CREATE
 * — assemble around, flying into place from scattered points on a real-time
 * clock (not scroll progress, since this must look complete the instant the
 * page loads) as one continuous ring joined by glowing "data courier"
 * particles that flow through the same order, exactly like the company's own
 * five-step thought process. CREATE completing hands its energy back into
 * the core, which pulses brightest right as the pipeline finishes assembling
 * — the system visibly "creating" something. This is the ONLY chapter that
 * renders this pipeline — every other chapter's own 3D scene is unrelated to
 * it (see three/scenes/NeuralScene.tsx, now its own standalone technology
 * network). The whole composition tilts toward the pointer, and the core
 * itself subtly brightens the closer the pointer sits to centre — a light,
 * physics-like response layered on top of a permanent idle drift.
 */
export function IntroScene({ quality }: IntroSceneProps) {
  const groupRef = useRef<Group>(null);
  const starsHandle = useRef<ParticleSystemHandle>(null);
  const nebulaRefs = useRef<Mesh[]>([]);
  const initialized = useRef(false);
  const count = tieredParticleCount(2200, quality);
  const objectScale = SCENE_TIER_CONFIG[quality].objectScale;

  const pipelineRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);
  const coreWireRef = useRef<Mesh>(null);
  const coreGlowRef = useRef<Mesh>(null);
  const nodeRefs = useRef<Mesh[]>([]);
  const ringMaterialRefs = useRef<LineBasicMaterial[]>([]);
  const travelerRefs = useRef<Mesh[]>([]);
  const fitScale = useRef(1);

  const pipelineScale = PIPELINE_SCALE * SCENE_TIER_CONFIG[quality].objectScale;
  const travelerCount = TRAVELER_COUNT[quality];
  const nodeCount = heroPipelineNodes.length;
  const showLabels = quality !== "low";

  const spawnDirections = useMemo(() => heroPipelineNodes.map(() => randomUnitVector()), []);

  const ringPositions = useMemo(
    () =>
      heroPipelineNodes.map((node, index) => {
        const next = heroPipelineNodes[(index + 1) % nodeCount];
        if (!next) return new Float32Array(6);
        return new Float32Array([
          node.position[0] * pipelineScale,
          node.position[1] * pipelineScale,
          node.position[2] * pipelineScale,
          next.position[0] * pipelineScale,
          next.position[1] * pipelineScale,
          next.position[2] * pipelineScale,
        ]);
      }),
    [pipelineScale, nodeCount]
  );

  useFrame((state, delta) => {
    const weight = journeyState.weight.intro;
    const group = groupRef.current;
    const time = state.clock.elapsedTime;
    const pointer = journeyState.pointer;
    const pointerEnergy = clamp(1 - Math.hypot(pointer.x, pointer.y) * 0.5, 0.5, 1);

    if (group) {
      group.visible = weight > 0.001;
      group.rotation.y += delta * 0.015;
    }

    if (!initialized.current) {
      const positions = starsHandle.current?.positions;
      if (positions) {
        const pointCount = positions.length / 3;
        for (let i = 0; i < pointCount; i += 1) {
          const radius = 4 + Math.random() * 5;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
          positions[i * 3 + 2] = radius * Math.cos(phi) - 3;
        }
        const attribute = starsHandle.current?.points?.geometry.attributes.position as
          | BufferAttribute
          | undefined;
        if (attribute) attribute.needsUpdate = true;
        initialized.current = true;
      }
    }

    const starMaterial = starsHandle.current?.material;
    if (starMaterial) {
      starMaterial.opacity = damp(starMaterial.opacity, 0.65 * weight, 4, delta);
    }

    nebulaRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const t = time * 0.2 + index * 2;
      mesh.position.y = Math.sin(t) * 0.4;
      mesh.position.x = Math.cos(t * 0.7) * 0.6 + (index - 1) * 2.4;
      const material = mesh.material as MeshBasicMaterial;
      material.opacity = damp(material.opacity, 0.12 * weight, 4, delta);
    });

    // The hero pipeline: entrance driven entirely by real elapsed time, so
    // it looks fully assembled at rest before any scroll input — pointer
    // tilt and the mobile frustum-fit correction still apply continuously.
    const pipeline = pipelineRef.current;
    if (pipeline) {
      const tiltX = damp(pipeline.rotation.x, pointer.y * 0.1, 3, delta);
      const tiltY = damp(pipeline.rotation.y, pointer.x * 0.14 + time * 0.03, 3, delta);
      pipeline.rotation.x = tiltX;
      pipeline.rotation.y = tiltY;

      let targetFit = 1;
      if (quality !== "high") {
        const viewport = state.viewport.getCurrentViewport(state.camera, [0.6, -0.1, -1.1], state.size);
        const worldWidth = PIPELINE_HALF_EXTENT * pipelineScale * 2;
        targetFit = Math.min(1, (viewport.width * MOBILE_FIT_MARGIN) / worldWidth);
      }
      fitScale.current = damp(fitScale.current, Math.max(targetFit, 0.001), 4, delta);
      pipeline.scale.setScalar(fitScale.current);
    }

    const appearValues = heroPipelineNodes.map((_, i) =>
      smoothstep(
        ENTRANCE_START_DELAY + i * ENTRANCE_STAGGER,
        ENTRANCE_START_DELAY + i * ENTRANCE_STAGGER + ENTRANCE_NODE_DURATION,
        time
      )
    );
    const createAppear = appearValues[nodeCount - 1] ?? 0;

    nodeRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const appear = appearValues[i] ?? 0;
      const eased = smoothstep(0, 1, appear);
      mesh.scale.setScalar(damp(mesh.scale.x, 0.4 + eased * 0.7, 6, delta));
      const material = mesh.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, eased * weight, 5, delta);
      material.emissiveIntensity = damp(material.emissiveIntensity, 0.6 + eased * 0.8, 5, delta);

      const finalPos = mesh.userData.finalPosition as [number, number, number] | undefined;
      const direction = spawnDirections[i];
      if (finalPos && direction) {
        const spread = (1 - eased) * 1.4 * pipelineScale;
        mesh.position.set(
          finalPos[0] + direction[0] * spread,
          finalPos[1] + direction[1] * spread,
          finalPos[2] + direction[2] * spread
        );
      }
    });

    let ringAppearAverage = 0;
    ringMaterialRefs.current.forEach((material, i) => {
      if (!material) return;
      const a = appearValues[i] ?? 0;
      const b = appearValues[(i + 1) % nodeCount] ?? 0;
      const ringAppear = Math.min(a, b);
      ringAppearAverage += ringAppear;
      material.opacity = damp(material.opacity, ringAppear * weight * 0.7, 5, delta);
    });
    ringAppearAverage /= Math.max(nodeCount, 1);

    travelerRefs.current.forEach((mesh, i) => {
      const speed = 0.4 + i * 0.12;
      const t = ((time * speed) / nodeCount + i / Math.max(travelerCount, 1)) % 1;
      const scaled = t * nodeCount;
      const edgeIndex = Math.floor(scaled) % nodeCount;
      const edgeT = scaled - Math.floor(scaled);
      const from = heroPipelineNodes[edgeIndex]?.position ?? [0, 0, 0];
      const to = heroPipelineNodes[(edgeIndex + 1) % nodeCount]?.position ?? from;
      mesh.position.set(
        lerp(from[0], to[0], edgeT) * pipelineScale,
        lerp(from[1], to[1], edgeT) * pipelineScale,
        lerp(from[2], to[2], edgeT) * pipelineScale
      );
      const material = mesh.material as MeshBasicMaterial;
      material.opacity = damp(material.opacity, ringAppearAverage * weight * 0.9, 5, delta);
    });

    const idlePulse = 1 + Math.sin(time * 0.6) * 0.05;
    const corePulse = idlePulse * (1 + createAppear * 0.35) * pointerEnergy;
    if (coreRef.current) {
      const material = coreRef.current.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, (0.55 + createAppear * 0.35) * weight, 4, delta);
      material.emissiveIntensity = damp(
        material.emissiveIntensity,
        (0.5 + createAppear * 0.9) * pointerEnergy,
        4,
        delta
      );
      coreRef.current.rotation.y += delta * 0.1;
      coreRef.current.scale.setScalar(damp(coreRef.current.scale.x, corePulse, 4, delta));
    }
    if (coreWireRef.current) {
      const material = coreWireRef.current.material as MeshBasicMaterial;
      material.opacity = damp(material.opacity, 0.3 * weight, 4, delta);
      coreWireRef.current.rotation.y -= delta * 0.06;
      coreWireRef.current.scale.setScalar(damp(coreWireRef.current.scale.x, corePulse * 1.22, 4, delta));
    }
    if (coreGlowRef.current) {
      const material = coreGlowRef.current.material as MeshBasicMaterial;
      material.opacity = damp(material.opacity, 0.16 * (0.6 + createAppear * 0.6) * weight, 3, delta);
      coreGlowRef.current.scale.setScalar(damp(coreGlowRef.current.scale.x, corePulse * 1.9, 3, delta));
    }
  });

  return (
    <group ref={groupRef} scale={objectScale}>
      <ParticleSystem
        ref={starsHandle}
        count={count}
        size={0.045}
        color="#e5e9f2"
        opacity={0}
        additive
        sizeAttenuation
      />
      {NEBULA_COLORS.map((color, index) => (
        <mesh
          key={color}
          position={[(index - 1) * 2.4, 0, -4 - index]}
          ref={(mesh) => {
            if (mesh) nebulaRefs.current[index] = mesh;
          }}
        >
          <sphereGeometry args={[2.2, 24, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}

      {/* The hero pipeline — offset from centre so it reads as environment
          around the HTML title rather than sitting flush behind it. */}
      <group ref={pipelineRef} position={[0.6, -0.1, -1.1]}>
        <mesh ref={coreGlowRef}>
          <icosahedronGeometry args={[0.34, 1]} />
          <meshBasicMaterial transparent opacity={0} color="#f14a30" depthWrite={false} />
        </mesh>
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[0.34, 2]} />
          <meshStandardMaterial
            transparent
            opacity={0}
            color="#e5e9f2"
            emissive="#f14a30"
            emissiveIntensity={0.5}
            roughness={0.2}
            metalness={0.5}
          />
        </mesh>
        <mesh ref={coreWireRef}>
          <icosahedronGeometry args={[0.34, 1]} />
          <meshBasicMaterial transparent opacity={0} color="#fd6a50" wireframe />
        </mesh>

        {heroPipelineNodes.map((node, index) => (
          <mesh
            key={node.id}
            position={[
              node.position[0] * pipelineScale,
              node.position[1] * pipelineScale,
              node.position[2] * pipelineScale,
            ]}
            userData={{
              finalPosition: [
                node.position[0] * pipelineScale,
                node.position[1] * pipelineScale,
                node.position[2] * pipelineScale,
              ],
            }}
            ref={(mesh) => {
              if (mesh) nodeRefs.current[index] = mesh;
            }}
          >
            <icosahedronGeometry args={[0.14, 1]} />
            <meshStandardMaterial
              transparent
              opacity={0}
              color="#f14a30"
              emissive="#f14a30"
              emissiveIntensity={0.6}
              roughness={0.3}
              metalness={0.4}
            />
            {showLabels ? (
              <Html center distanceFactor={8} className="pointer-events-none select-none">
                <span className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.3em] text-brand-300/80">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="whitespace-nowrap rounded-full border border-brand-400/40 bg-ink-950/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-white shadow-[0_0_20px_-4px_rgba(241,74,48,0.7)] backdrop-blur">
                    {node.label}
                  </span>
                </span>
              </Html>
            ) : null}
          </mesh>
        ))}

        {ringPositions.map((positions, i) => (
          <line key={`hero-ring-${heroPipelineNodes[i]?.id ?? i}`}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            </bufferGeometry>
            <lineBasicMaterial
              transparent
              opacity={0}
              color="#fd6a50"
              ref={(material) => {
                if (material) ringMaterialRefs.current[i] = material;
              }}
            />
          </line>
        ))}

        {Array.from({ length: travelerCount }, (_, index) => (
          <mesh
            key={`hero-traveler-${index}`}
            ref={(mesh) => {
              if (mesh) travelerRefs.current[index] = mesh;
            }}
          >
            <sphereGeometry args={[0.04, 10, 10]} />
            <meshBasicMaterial transparent opacity={0} color="#ffd9a0" />
          </mesh>
        ))}
      </group>
    </group>
  );
}
