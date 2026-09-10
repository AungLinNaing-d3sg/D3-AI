"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type {
  BufferAttribute,
  Group,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
} from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { clamp, damp, lerp, smoothstep } from "@/lib/motion/mathUtils";
import { clusterPoints, galaxyPoints, sampleTextPoints } from "@/lib/three/textSampler";
import { universeStatRanges, universeStations } from "@/data/journey";
import type { UniverseStation, UniverseStationVariant } from "@/types";
import { SCENE_TIER_CONFIG, tieredParticleCount, type SceneQuality } from "@/lib/three/deviceTiers";

interface UniverseSceneProps {
  quality: SceneQuality;
}

type Vec3 = [number, number, number];
type Edge = [number, number];

interface StationLayout {
  /** Small, hand-authored node anchor points, local to the station's own
   * group (see `buildStationWorldPositions`) — never randomised, so every
   * reload reads the same intentional shape. */
  nodes: Vec3[];
  /** Node index pairs joined by a connecting line. */
  edges: Edge[];
  /** Base colour for this station's nodes/lines/particle field. */
  color: string;
  /** Whether small particle "couriers" travel the connections once formed
   * (Real-world only) — omitted on `quality === "low"` for performance. */
  travellers: boolean;
}

/** Base (desktop) Z-depth spacing between consecutive stations — this, not
 * any change to the shared global camera, is what the "camera dolly" (see
 * the `useFrame` below) actually travels through. Scaled down per device
 * tier by `depthScale` (see `src/lib/three/deviceTiers.ts`) so tablet/mobile
 * get a shorter, cheaper dolly instead of the full cinematic depth. */
const BASE_STATION_SPACING = 4.6;

/** Small x/y offsets per station index so the dolly path reads as a gentle
 * cinematic weave rather than a dead-straight line. */
const STATION_XY_OFFSETS: [number, number][] = [
  [0, 0.1],
  [-0.85, 0],
  [0.85, 0.05],
  [0, -0.1],
];

/**
 * Hand-authored per-station structure — see `UniverseStationVariant` in
 * src/types/index.ts for what each shape communicates. Every variant is a
 * genuinely different composition (hub cluster / receding timeline / cube
 * network / irregular graph), not one wireframe recoloured four times.
 */
const STATION_LAYOUTS: Record<UniverseStationVariant, StationLayout> = {
  // Singapore — a compact hub-and-spoke data cluster: one hub with a small
  // cross-linked ring of satellite nodes, reading as a single, structured
  // location anchoring a regional data network.
  location: {
    nodes: [
      [0, 0, 0],
      [0.55, 0.34, 0.12],
      [-0.5, 0.3, -0.16],
      [0.36, -0.42, 0.2],
      [-0.42, -0.36, -0.06],
      [0.16, 0.56, -0.2],
      [-0.2, -0.58, 0.16],
    ],
    edges: [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [0, 5],
      [0, 6],
      [1, 5],
      [3, 4],
    ],
    color: "#fd6a50",
    travellers: false,
  },
  // 20+ years — a chain of depth markers receding into the screen behind
  // the large "20+" typography, reading as a dimensional timeline rather
  // than a flat number.
  timeline: {
    nodes: [
      [0, 0.1, 0.4],
      [0.32, 0.16, -0.35],
      [-0.28, 0.05, -1.1],
      [0.24, 0.14, -1.85],
      [-0.22, 0.02, -2.6],
      [0.18, 0.1, -3.35],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
    ],
    color: "#ffb199",
    travellers: false,
  },
  // Microsoft — a structured cube of technology nodes/blocks (8 corners,
  // 12 edges), communicating an assembled, connected platform rather than
  // an organic network.
  network: {
    nodes: [
      [-0.46, 0.34, 0.34],
      [0.46, 0.34, 0.34],
      [-0.46, -0.34, 0.34],
      [0.46, -0.34, 0.34],
      [-0.46, 0.34, -0.34],
      [0.46, 0.34, -0.34],
      [-0.46, -0.34, -0.34],
      [0.46, -0.34, -0.34],
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
      [4, 5],
      [4, 6],
      [5, 7],
      [6, 7],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ],
    color: "#67e8f9",
    travellers: false,
  },
  // Real-world — an irregular graph of project nodes, with particle
  // "couriers" travelling the connections once formed — reads as active
  // delivery/impact rather than a static diagram.
  impact: {
    nodes: [
      [-0.5, 0.3, 0.1],
      [0.15, 0.5, -0.2],
      [0.55, -0.05, 0.15],
      [0.05, -0.45, -0.1],
      [-0.45, -0.25, 0.3],
      [-0.05, 0.05, -0.45],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
      [0, 5],
      [2, 5],
    ],
    color: "#a5b4fc",
    travellers: true,
  },
};

const BACKGROUND_WORDS = ["DATA", "IMPACT", "REAL", "EXPERIENCE"] as const;
const BACKGROUND_WORD_LAYOUT: [number, number][] = [
  [-1.6, 0.7],
  [1.3, -0.6],
  [-0.9, -0.75],
  [1.6, 0.65],
];

/** Builds the world position each station's group sits at — every
 * per-station visual (particle field, nodes, edges) is a child of this, so
 * it only needs small, local-scale coordinates (see `STATION_LAYOUTS`).
 * `stationSpacing` is the device-tiered value (see `BASE_STATION_SPACING`),
 * not the fixed desktop constant, so the dolly travels a shorter Z distance
 * on tablet/mobile. */
function buildStationWorldPositions(stationSpacing: number): Vec3[] {
  return universeStations.map((_, index) => {
    const offset: [number, number] = STATION_XY_OFFSETS[index] ?? [0, 0];
    return [offset[0], offset[1], -index * stationSpacing];
  });
}

/** Mirrors the page-level chapter crossfade envelope in
 * lib/motion/scrollTimeline.ts (not exported there — it's intentionally
 * private to the single global timeline), scoped down to blending between
 * this one chapter's own stations rather than duplicating global timeline
 * API surface for a single caller. */
function stationFocus(local: number, edge: number, isFirst: boolean, isLast: boolean): number {
  const inWeight = isFirst ? 1 : smoothstep(0, edge, local);
  const outWeight = isLast ? 1 : 1 - smoothstep(1 - edge, 1, local);
  return clamp(Math.min(inWeight, outWeight));
}

/** The "20+ years" statistic's giant 3D typography centrepiece uses only the
 * leading "20+" — full "20+ years" stays intact as real HTML text in
 * components/sections/UniverseSection.tsx; trimming here is purely a visual
 * simplification for the particle-formed word (long text samples poorly at
 * a station's compact local scale), never a change to the sourced data
 * itself. */
function displayToken(station: UniverseStation): string {
  if (station.variant !== "timeline") return station.stat.token;
  const match = /^\d+\+?/.exec(station.stat.token);
  return match ? match[0] : station.stat.token;
}

/**
 * Chapter 05 — Data Universe ("By the numbers"). Redesigned as a single
 * cinematic data universe the camera dollies through (see the `useFrame`
 * below), rather than one particle field recoloured for four statistics:
 * each real, sourced statistic (src/data/pillars.ts via data/journey.ts
 * `universeStations`) gets its own distinct structure — a Singapore data
 * cluster, a receding "20+ years" timeline, a Microsoft technology cube, and
 * a Real-world impact graph with travelling particles — that assembles
 * (particles gather → structure forms → statistic typography emerges →
 * connections animate) and dissolves again as scroll progress moves
 * forward/backward. Very large, low-opacity background words drift slowly
 * through Z for atmosphere. The always-visible, accessible statistic cards
 * in components/sections/UniverseSection.tsx remain the primary information
 * layer; everything here is decorative/aria-hidden.
 */
export function UniverseScene({ quality }: UniverseSceneProps) {
  const dollyRef = useRef<Group>(null);
  const stationGroupRefs = useRef<Array<Group | null>>([]);
  const fieldHandleRefs = useRef<Array<ParticleSystemHandle | null>>([]);
  const nodeMeshRefs = useRef<Mesh[][]>([]);
  const edgeMaterialRefs = useRef<LineBasicMaterial[][]>([]);
  const travellerMeshRefs = useRef<Mesh[][]>([]);
  const backgroundGroupRefs = useRef<Array<Group | null>>([]);
  const backgroundHandleRefs = useRef<Array<ParticleSystemHandle | null>>([]);
  const backgroundInitialized = useRef<boolean[]>(BACKGROUND_WORDS.map(() => false));

  const perStationCount = tieredParticleCount(900, quality);
  const backgroundCount = tieredParticleCount(220, quality);
  const tierConfig = SCENE_TIER_CONFIG[quality];
  const stationSpacing = BASE_STATION_SPACING * tierConfig.depthScale;
  const stationWorldPositions = useMemo(
    () => buildStationWorldPositions(stationSpacing),
    [stationSpacing]
  );

  const edgeSegments = useMemo(
    () =>
      universeStations.map((station) => {
        const layout = STATION_LAYOUTS[station.variant];
        return layout.edges.map(([a, b]) => {
          const from: Vec3 = layout.nodes[a] ?? [0, 0, 0];
          const to: Vec3 = layout.nodes[b] ?? [0, 0, 0];
          return new Float32Array([from[0], from[1], from[2], to[0], to[1], to[2]]);
        });
      }),
    []
  );

  const stationFields = useMemo(() => {
    if (typeof document === "undefined") return [];
    return universeStations.map((station) => {
      const layout = STATION_LAYOUTS[station.variant];
      return {
        keyframes: [
          galaxyPoints(perStationCount, 3.1),
          clusterPoints(layout.nodes, perStationCount, 0.85),
          sampleTextPoints(displayToken(station), perStationCount, 240, 2.9),
          galaxyPoints(perStationCount, 3.1),
        ],
      };
    });
  }, [perStationCount]);

  const stationPhases = useMemo(
    () =>
      universeStations.map(() => {
        const array = new Float32Array(perStationCount);
        for (let i = 0; i < perStationCount; i += 1) array[i] = Math.random() * Math.PI * 2;
        return array;
      }),
    [perStationCount]
  );

  const backgroundWordFields = useMemo(() => {
    if (typeof document === "undefined") return [];
    return BACKGROUND_WORDS.map((word) => sampleTextPoints(word, backgroundCount, 200, 9));
  }, [backgroundCount]);

  const stationCount = universeStations.length;

  useFrame((state, delta) => {
    const weight = journeyState.weight.universe;
    const progress = clamp(journeyState.progress.universe);
    const time = state.clock.elapsedTime;
    const dolly = dollyRef.current;

    if (dolly) dolly.visible = weight > 0.001;

    // Cinematic dolly: slide the whole station assembly so scroll progress
    // continuously carries the "camera" between each statistic's own
    // composition, without touching the shared global camera (see
    // lib/motion/scrollTimeline.ts, still the single source of truth for the
    // real THREE.PerspectiveCamera across all 9 chapters) — this chapter's
    // *content* travels instead.
    const continuous = progress * Math.max(stationCount - 1, 1);
    const baseIndex = Math.min(Math.floor(continuous), stationCount - 1);
    const nextIndex = Math.min(baseIndex + 1, stationCount - 1);
    const dollyT = smoothstep(0, 1, continuous - baseIndex);
    const fromPos: Vec3 = stationWorldPositions[baseIndex] ?? [0, 0, 0];
    const toPos: Vec3 = stationWorldPositions[nextIndex] ?? fromPos;

    if (dolly) {
      const targetX = -lerp(fromPos[0], toPos[0], dollyT);
      const targetY = -lerp(fromPos[1], toPos[1], dollyT) * 0.6;
      const targetZ = -lerp(fromPos[2], toPos[2], dollyT);
      dolly.position.x = damp(dolly.position.x, targetX, 3, delta);
      dolly.position.y = damp(dolly.position.y, targetY, 3, delta);
      dolly.position.z = damp(dolly.position.z, targetZ, 3, delta);
      dolly.rotation.y = damp(dolly.rotation.y, Math.sin(progress * Math.PI) * 0.06, 3, delta);
    }

    // Background typography: very large, low-opacity words drifting slowly
    // through Z with scroll progress — atmosphere behind the real stations,
    // never competing with their content or the HTML statistic cards.
    BACKGROUND_WORDS.forEach((_, i) => {
      const handle = backgroundHandleRefs.current[i];
      const group = backgroundGroupRefs.current[i];
      if (!handle) return;

      if (!backgroundInitialized.current[i]) {
        const source = backgroundWordFields[i];
        if (source) {
          handle.positions.set(source);
          const attribute = handle.points?.geometry.attributes.position as BufferAttribute | undefined;
          if (attribute) attribute.needsUpdate = true;
          backgroundInitialized.current[i] = true;
        }
      }

      if (group) {
        const drift = progress * 3.5;
        group.position.z = damp(group.position.z, -(i * 6) - 6 + drift, 2, delta);
      }
      if (handle.material) {
        handle.material.opacity = damp(handle.material.opacity, 0.05 * weight, 3, delta);
      }
    });

    universeStations.forEach((station, index) => {
      const layout = STATION_LAYOUTS[station.variant];
      const range = universeStatRanges[index];
      const field = stationFields[index];
      const group = stationGroupRefs.current[index];
      if (!range || !field) return;

      const span = Math.max(range.end - range.start, 1e-6);
      const local = clamp((progress - range.start) / span);
      const focus = stationFocus(local, 0.3, index === 0, index === stationCount - 1);
      const stationVisibility = weight * focus;

      if (group) {
        group.visible = stationVisibility > 0.001;
        group.rotation.y = damp(group.rotation.y, Math.sin(time * 0.12 + index) * 0.03, 3, delta);
      }

      // Particle field: scatter -> gathered structure -> statistic
      // typography -> scatter, driven entirely by this station's own local
      // progress so scrolling back up reverses the sequence naturally.
      const handle = fieldHandleRefs.current[index];
      const positions = handle?.positions;
      const material = handle?.material;
      if (material) {
        material.opacity = damp(material.opacity, 0.85 * stationVisibility, 4, delta);
      }
      if (positions && stationVisibility > 0.001) {
        const segments = field.keyframes.length - 1;
        const scaled = Math.min(local, 0.9999) * segments;
        const segIndex = Math.floor(scaled);
        const segT = smoothstep(0, 1, scaled - segIndex);
        const from = field.keyframes[segIndex] ?? field.keyframes[0];
        const to = field.keyframes[segIndex + 1] ?? from;
        const phases = stationPhases[index];
        if (from && to) {
          for (let i = 0; i < perStationCount; i += 1) {
            const base = i * 3;
            const phase = phases?.[i] ?? 0;
            const jitter = Math.sin(time * 0.6 + phase) * 0.02;
            positions[base] = lerp(from[base] ?? 0, to[base] ?? 0, segT) + jitter;
            positions[base + 1] = lerp(from[base + 1] ?? 0, to[base + 1] ?? 0, segT) + jitter * 0.6;
            positions[base + 2] = lerp(from[base + 2] ?? 0, to[base + 2] ?? 0, segT);
          }
          const attribute = handle?.points?.geometry.attributes.position as BufferAttribute | undefined;
          if (attribute) attribute.needsUpdate = true;
        }
      }

      // Structure: nodes assemble first (staggered), edges connect once
      // both endpoints have appeared — "data structure forms" ahead of the
      // statistic itself emerging.
      const nodeMeshes: Mesh[] = nodeMeshRefs.current[index] ?? [];
      const appearValues = layout.nodes.map((_, ni) => smoothstep(0.04 + ni * 0.03, 0.3 + ni * 0.03, local));
      nodeMeshes.forEach((mesh, ni) => {
        if (!mesh) return;
        const appear = appearValues[ni] ?? 0;
        const targetScale = 0.5 + appear * 0.6;
        mesh.scale.setScalar(damp(mesh.scale.x, targetScale, 6, delta));
        const meshMaterial = mesh.material as MeshStandardMaterial;
        meshMaterial.opacity = damp(meshMaterial.opacity, appear * stationVisibility, 5, delta);
        meshMaterial.emissiveIntensity = damp(meshMaterial.emissiveIntensity, 0.5 + appear * 0.9, 5, delta);
      });

      const edgeMaterials: LineBasicMaterial[] = edgeMaterialRefs.current[index] ?? [];
      edgeMaterials.forEach((edgeMaterial, ei) => {
        if (!edgeMaterial) return;
        const pair = layout.edges[ei];
        const a = appearValues[pair?.[0] ?? 0] ?? 0;
        const b = appearValues[pair?.[1] ?? 0] ?? 0;
        edgeMaterial.opacity = damp(edgeMaterial.opacity, Math.min(a, b) * stationVisibility * 0.55, 5, delta);
      });

      // Real-world only: small particle "couriers" travel each connection
      // once it has formed, reading as active delivery rather than a static
      // diagram.
      const travellerMeshes = travellerMeshRefs.current[index];
      if (layout.travellers && travellerMeshes) {
        const segmentsList: Float32Array[] = edgeSegments[index] ?? [];
        travellerMeshes.forEach((mesh, ei) => {
          if (!mesh) return;
          const positionsArray = segmentsList[ei];
          const pair = layout.edges[ei];
          const a = appearValues[pair?.[0] ?? 0] ?? 0;
          const b = appearValues[pair?.[1] ?? 0] ?? 0;
          const edgeAppear = Math.min(a, b);
          const material = mesh.material as MeshBasicMaterial;
          material.opacity = damp(material.opacity, edgeAppear * stationVisibility * 0.9, 5, delta);
          if (positionsArray) {
            const t = (time * 0.35 + ei * 0.17) % 1;
            mesh.position.set(
              lerp(positionsArray[0] ?? 0, positionsArray[3] ?? 0, t),
              lerp(positionsArray[1] ?? 0, positionsArray[4] ?? 0, t),
              lerp(positionsArray[2] ?? 0, positionsArray[5] ?? 0, t)
            );
          }
        });
      }
    });
  });

  return (
    <group ref={dollyRef} scale={tierConfig.objectScale}>
      {BACKGROUND_WORDS.map((word, i) => {
        const layout: [number, number] = BACKGROUND_WORD_LAYOUT[i] ?? [0, 0];
        return (
          <group
            key={`universe-bg-${word}`}
            position={[layout[0], layout[1], -(i * 6) - 6]}
            ref={(g) => {
              backgroundGroupRefs.current[i] = g;
            }}
          >
            <ParticleSystem
              ref={(handle) => {
                backgroundHandleRefs.current[i] = handle;
              }}
              count={backgroundCount}
              size={0.05}
              color="#c7cfe0"
              opacity={0}
              sizeAttenuation
            />
          </group>
        );
      })}

      {universeStations.map((station, index) => {
        const layout = STATION_LAYOUTS[station.variant];
        const position: Vec3 = stationWorldPositions[index] ?? [0, 0, -index * stationSpacing];

        return (
          <group
            key={station.stat.label}
            position={position}
            ref={(g) => {
              stationGroupRefs.current[index] = g;
            }}
          >
            <ParticleSystem
              ref={(handle) => {
                fieldHandleRefs.current[index] = handle;
              }}
              count={perStationCount}
              size={0.03}
              color={layout.color}
              opacity={0}
              additive
              sizeAttenuation
            />

            {layout.nodes.map((node, ni) => (
              <mesh
                key={`${station.variant}-node-${ni}`}
                position={node}
                ref={(mesh) => {
                  if (!mesh) return;
                  const bucket: Mesh[] = nodeMeshRefs.current[index] ?? [];
                  bucket[ni] = mesh;
                  nodeMeshRefs.current[index] = bucket;
                }}
              >
                <icosahedronGeometry args={[0.06, 0]} />
                <meshStandardMaterial
                  transparent
                  opacity={0}
                  color={layout.color}
                  emissive={layout.color}
                  emissiveIntensity={0.7}
                  roughness={0.3}
                  metalness={0.4}
                />
              </mesh>
            ))}

            {(edgeSegments[index] ?? []).map((edgePositions, ei) => (
              <line key={`${station.variant}-edge-${ei}`}>
                <bufferGeometry>
                  <bufferAttribute attach="attributes-position" args={[edgePositions, 3]} />
                </bufferGeometry>
                <lineBasicMaterial
                  transparent
                  opacity={0}
                  color={layout.color}
                  ref={(material) => {
                    if (!material) return;
                    const bucket: LineBasicMaterial[] = edgeMaterialRefs.current[index] ?? [];
                    bucket[ei] = material;
                    edgeMaterialRefs.current[index] = bucket;
                  }}
                />
              </line>
            ))}

            {layout.travellers &&
              quality === "high" &&
              (edgeSegments[index] ?? []).map((_, ei) => (
                <mesh
                  key={`${station.variant}-traveller-${ei}`}
                  ref={(mesh) => {
                    if (!mesh) return;
                    const bucket: Mesh[] = travellerMeshRefs.current[index] ?? [];
                    bucket[ei] = mesh;
                    travellerMeshRefs.current[index] = bucket;
                  }}
                >
                  <sphereGeometry args={[0.035, 10, 10]} />
                  <meshBasicMaterial transparent opacity={0} color={layout.color} />
                </mesh>
              ))}
          </group>
        );
      })}
    </group>
  );
}
