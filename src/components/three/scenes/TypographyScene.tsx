"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CanvasTexture,
  Color,
  type Group,
  type LineBasicMaterial,
  type Mesh,
  type MeshBasicMaterial,
  type Sprite,
  type SpriteMaterial,
  type Texture,
} from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { disciplineFocus } from "@/lib/motion/disciplineFocus";
import { clamp, damp, smoothstep } from "@/lib/motion/mathUtils";
import { SCENE_TIER_CONFIG, tieredParticleCount, type SceneQuality } from "@/lib/three/deviceTiers";

interface TypographySceneProps {
  quality: SceneQuality;
}

/** Same accent triad used by the accessible discipline cards in
 * `TypographySection.tsx` — Data / Dynamics / Digital. */
const DISCIPLINE_ACCENTS = ["#00d2ff", "#ff4d2d", "#00e676"] as const;
const DISCIPLINE_LABELS = ["DATA", "DYNAMICS", "DIGITAL"] as const;
const DISCIPLINE_COUNT = 3;

const SPHERE_RADIUS = 1.7;
const NODE_COUNT_BASE = 420;
const NEIGHBORS_PER_NODE = 3;
const PIN_RELEASE_DISTANCE = 0.08;

interface SphereNode {
  /** Base (unjittered) position on the Fibonacci sphere shell. */
  position: [number, number, number];
  /** Which discipline third of the sphere this node belongs to (0..2), by
   * azimuthal angle — see `regionForAngle`. */
  region: number;
  /** Slight per-node radius/phase variance so the sphere reads as organic
   * and volumetric rather than a perfectly smooth demo primitive. */
  radiusJitter: number;
  phase: number;
}

/** Standard Fibonacci-sphere point distribution — evenly spread points with
 * no clustering at the poles, unlike a naive lat/long grid. */
function buildFibonacciSphere(count: number): SphereNode[] {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (i / Math.max(count - 1, 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    const angle = Math.atan2(z, x);
    const normalized = (angle + Math.PI * 2) % (Math.PI * 2);
    const region = Math.floor((normalized / (Math.PI * 2)) * DISCIPLINE_COUNT) % DISCIPLINE_COUNT;
    return {
      position: [x * SPHERE_RADIUS, y * SPHERE_RADIUS, z * SPHERE_RADIUS],
      region,
      radiusJitter: 0.94 + Math.random() * 0.1,
      phase: Math.random() * Math.PI * 2,
    };
  });
}

/** The azimuthal centre of each discipline's third of the sphere — the
 * sphere's own idle rotation eases toward `-centre` for whichever discipline
 * is active, so that discipline's own cluster of nodes turns to face the
 * camera. Order matches `DISCIPLINE_ACCENTS` (Data, Dynamics, Digital). */
const REGION_CENTER_ANGLES = Array.from(
  { length: DISCIPLINE_COUNT },
  (_, i) => -Math.PI + (i + 0.5) * ((Math.PI * 2) / DISCIPLINE_COUNT)
);

/** Nearest-neighbour edges (deduplicated, undirected), computed once from
 * the static node layout — the "connect nearby nodes with thin wireframe
 * lines" the brief asks for. */
function buildEdges(nodes: SphereNode[], neighborsPerNode: number): Array<[number, number]> {
  const seen = new Set<string>();
  const edges: Array<[number, number]> = [];
  nodes.forEach((node, i) => {
    const [ax, ay, az] = node.position;
    const nearest = nodes
      .map((other, j) => {
        if (i === j) return { j, distance: Infinity };
        const [bx, by, bz] = other.position;
        const dx = ax - bx;
        const dy = ay - by;
        const dz = az - bz;
        return { j, distance: dx * dx + dy * dy + dz * dz };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, neighborsPerNode);
    nearest.forEach(({ j }) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push(i < j ? [i, j] : [j, i]);
    });
  });
  return edges;
}

/** One discipline's own node cloud + its own edge lattice — a single
 * `ParticleSystem` (points) plus one `lineSegments`, both tinted with this
 * discipline's accent and brightening together as `activityRef` rises,
 * rather than per-node meshes (hundreds of individual objects would be far
 * more expensive for the same visual). */
function DisciplineCluster({
  region,
  nodes,
  edges,
  activityRef,
}: {
  region: number;
  nodes: SphereNode[];
  edges: Array<[number, number]>;
  activityRef: MutableRefObject<Float32Array>;
}) {
  const pointsHandle = useRef<ParticleSystemHandle>(null);
  const lineMaterialRef = useRef<LineBasicMaterial>(null);
  const accent = DISCIPLINE_ACCENTS[region] ?? "#fd6a50";
  const count = nodes.length;

  const basePositions = useMemo(
    () =>
      nodes.map((node) => ({
        x: node.position[0] * node.radiusJitter,
        y: node.position[1] * node.radiusJitter,
        z: node.position[2] * node.radiusJitter,
        phase: node.phase,
      })),
    [nodes]
  );

  const linePositions = useMemo(() => {
    const array = new Float32Array(edges.length * 6);
    edges.forEach(([a, b], i) => {
      const from = nodes[a];
      const to = nodes[b];
      if (!from || !to) return;
      const offset = i * 6;
      array[offset] = from.position[0] * from.radiusJitter;
      array[offset + 1] = from.position[1] * from.radiusJitter;
      array[offset + 2] = from.position[2] * from.radiusJitter;
      array[offset + 3] = to.position[0] * to.radiusJitter;
      array[offset + 4] = to.position[1] * to.radiusJitter;
      array[offset + 5] = to.position[2] * to.radiusJitter;
    });
    return array;
  }, [edges, nodes]);

  useFrame((state, delta) => {
    const weight = journeyState.weight.typography;
    const activity = activityRef.current[region] ?? 0;

    const material = pointsHandle.current?.material;
    if (material) {
      material.opacity = damp(material.opacity, (0.55 + activity * 0.45) * weight, 5, delta);
      material.size = damp(material.size, 0.028 + activity * 0.014, 6, delta);
    }
    if (lineMaterialRef.current) {
      lineMaterialRef.current.opacity = damp(lineMaterialRef.current.opacity, (0.12 + activity * 0.5) * weight, 5, delta);
    }
  });

  return (
    <>
      <ParticleSystem
        ref={pointsHandle}
        count={count}
        size={0.028}
        color={accent}
        opacity={0}
        additive
        onFrame={(positions, elapsedSeconds) => {
          for (let i = 0; i < basePositions.length; i += 1) {
            const base = basePositions[i];
            if (!base) continue;
            const drift = Math.sin(elapsedSeconds * 0.4 + base.phase) * 0.02;
            positions[i * 3] = base.x + drift;
            positions[i * 3 + 1] = base.y + Math.cos(elapsedSeconds * 0.35 + base.phase) * 0.02;
            positions[i * 3 + 2] = base.z + drift * 0.6;
          }
        }}
      />
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial ref={lineMaterialRef} transparent opacity={0} color={accent} />
      </line>
    </>
  );
}

/**
 * Renders a short, bold, pill-backed label onto an offscreen canvas — a
 * real WebGL sprite texture rather than a DOM overlay. `<Html transform>`
 * (drei's usual "real DOM content anchored to a 3D point" primitive) turned
 * out to badly mis-project its screen position here — hundreds of pixels
 * off — once nested inside this chapter's actively-rotating, dollying
 * sphere group deep down a long-scrolled page behind the fixed 3D canvas;
 * a sprite sidesteps that whole class of bug entirely (pure WebGL, no DOM
 * projection math) and, as a bonus, a `THREE.Sprite` always billboards to
 * face the camera on its own, keeping the label legible as the sphere
 * rotates — which is exactly the "feel integrated into the 3D scene, stay
 * readable" behaviour the brief asks for.
 */
function createLabelTexture(text: string, color: string): Texture {
  const canvas = document.createElement("canvas");
  const width = 256;
  const height = 72;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new CanvasTexture(canvas);

  const radius = height / 2;
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  ctx.moveTo(radius, 2);
  ctx.arcTo(width - 2, 2, width - 2, height - 2, radius);
  ctx.arcTo(width - 2, height - 2, 2, height - 2, radius);
  ctx.arcTo(2, height - 2, 2, 2, radius);
  ctx.arcTo(2, 2, width - 2, 2, radius);
  ctx.closePath();
  ctx.fillStyle = "rgba(5, 7, 13, 0.78)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = "700 30px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2 + 2);

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/** One discipline's 3D name tag — a billboard sprite anchored to its
 * cluster's own "anchor node" (its most central point — see
 * `anchorPositions` in the `clusters` memo below), so it moves with the
 * sphere as one of its own nodes rather than sitting as a flat overlay.
 * Brightens/lifts together with the rest of its cluster as `activityRef`
 * rises — a visual echo of the real, always-accessible card in
 * `TypographySection.tsx`, never the only place this name appears. */
function DisciplineLabel({
  region,
  position,
  activityRef,
}: {
  region: number;
  position: [number, number, number];
  activityRef: MutableRefObject<Float32Array>;
}) {
  const spriteRef = useRef<Sprite>(null);
  const accent = DISCIPLINE_ACCENTS[region] ?? "#ffffff";
  const label = DISCIPLINE_LABELS[region] ?? "";
  const texture = useMemo(() => (typeof document === "undefined" ? null : createLabelTexture(label, accent)), [
    label,
    accent,
  ]);

  useFrame((_, delta) => {
    const weight = journeyState.weight.typography;
    const activity = activityRef.current[region] ?? 0;
    const sprite = spriteRef.current;
    if (!sprite) return;
    const material = sprite.material as SpriteMaterial;
    material.opacity = damp(material.opacity, (0.55 + activity * 0.3) * weight, 5, delta);
    const scale = 0.14 + activity * 0.04;
    sprite.scale.set(scale * 2.4, scale, 1);
  });

  if (!texture) return null;

  return (
    <sprite ref={spriteRef} position={position}>
      <spriteMaterial map={texture} transparent opacity={0} depthWrite={false} />
    </sprite>
  );
}

/** The cross-region edges — nodes whose nearest neighbours happen to fall
 * in a different third of the sphere. Always dim and neutral (never tinted
 * to any one discipline's accent): the connective tissue that reads as
 * "one intelligent system", not three separate objects. */
function NeutralLattice({ positions }: { positions: Float32Array }) {
  const materialRef = useRef<LineBasicMaterial>(null);

  useFrame((_, delta) => {
    const weight = journeyState.weight.typography;
    if (materialRef.current) {
      materialRef.current.opacity = damp(materialRef.current.opacity, 0.14 * weight, 4, delta);
    }
  });

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial ref={materialRef} transparent opacity={0} color="#9aa6c2" />
    </line>
  );
}

/**
 * Chapter 03 — "Built from Real Disciplines". A single connected system: a
 * Fibonacci-distributed sphere of glowing nodes, thinly wired to their
 * nearest neighbours, split into three discipline clusters (Data, Dynamics,
 * Digital — see `DISCIPLINE_ACCENTS`) joined by a dim, neutral cross-region
 * lattice. No particle-formed text, no separate wireframe "core" object —
 * the sphere itself, continuously drifting and slowly spinning, *is* the
 * intelligent system.
 *
 * Scroll (three even thirds of `journeyState.progress.typography`) or a
 * click in the accessible card row (`TypographySection.tsx`, via
 * `disciplineFocus.pinned`) — never a mere hover — brings one cluster's nodes,
 * edges, and 3D label to full brightness while the other two dim, tints
 * the ambient glow shell toward that discipline's own accent, and smoothly
 * eases the whole sphere's own rotation so that cluster turns to face the
 * camera — "the camera moving toward the focal point" is simulated by
 * dollying/scaling this chapter's own group rather than touching the
 * shared camera rig (`three/CameraRig.tsx`) that every other chapter's
 * scroll-driven flight path also depends on, so this chapter's interaction
 * can never fight or destabilise theirs.
 */
export function TypographyScene({ quality }: TypographySceneProps) {
  const groupRef = useRef<Group>(null);
  const sphereRef = useRef<Group>(null);
  const glowRef = useRef<Mesh>(null);
  const activityRef = useRef<Float32Array>(new Float32Array(DISCIPLINE_COUNT));
  const rotationY = useRef(0);
  const dolly = useRef(0);
  const tilt = useRef({ x: 0, y: 0 });
  const fitScale = useRef(1);
  const pinBaseProgress = useRef<number | null>(null);
  const lastPinned = useRef<number | null>(null);
  const glowTintTarget = useMemo(() => new Color(), []);
  const glowTint = useRef(new Color("#ffd9a0"));

  const objectScale = SCENE_TIER_CONFIG[quality].objectScale;
  const nodeCount = tieredParticleCount(NODE_COUNT_BASE, quality);

  const nodes = useMemo(() => buildFibonacciSphere(nodeCount), [nodeCount]);
  const edges = useMemo(() => buildEdges(nodes, NEIGHBORS_PER_NODE), [nodes]);

  const clusters = useMemo(() => {
    const perRegion: Array<{ nodes: SphereNode[]; edges: Array<[number, number]> }> = Array.from(
      { length: DISCIPLINE_COUNT },
      () => ({ nodes: [], edges: [] })
    );
    // Re-index each region's own nodes/edges into locally-scoped arrays so
    // `DisciplineCluster` never has to filter the full node list every
    // render — index maps translate the original edge pairs into each
    // region's own local indices.
    const localIndexByGlobal: number[] = new Array(nodes.length).fill(-1);
    nodes.forEach((node, globalIndex) => {
      const region = perRegion[node.region];
      if (!region) return;
      localIndexByGlobal[globalIndex] = region.nodes.length;
      region.nodes.push(node);
    });
    const neutralEdgeIndices: Array<[number, number]> = [];
    edges.forEach(([a, b]) => {
      const nodeA = nodes[a];
      const nodeB = nodes[b];
      if (!nodeA || !nodeB) return;
      if (nodeA.region === nodeB.region) {
        const region = perRegion[nodeA.region];
        const localA = localIndexByGlobal[a];
        const localB = localIndexByGlobal[b];
        if (region && localA !== undefined && localB !== undefined && localA >= 0 && localB >= 0) {
          region.edges.push([localA, localB]);
        }
      } else {
        neutralEdgeIndices.push([a, b]);
      }
    });
    // Each region's own "anchor node" — the node closest to that region's
    // azimuthal centre at the sphere's equator — is what `DisciplineLabel`
    // anchors to, floating just outside the cluster it names rather than
    // an arbitrary fixed point that might drift away from any real node.
    const anchorPositions: Array<[number, number, number]> = REGION_CENTER_ANGLES.map((angle) => {
      const targetX = Math.cos(angle) * SPHERE_RADIUS;
      const targetZ = Math.sin(angle) * SPHERE_RADIUS;
      let closest: SphereNode | null = null;
      let closestDistance = Infinity;
      nodes.forEach((node) => {
        const dx = node.position[0] - targetX;
        const dy = node.position[1];
        const dz = node.position[2] - targetZ;
        const distance = dx * dx + dy * dy + dz * dz;
        if (distance < closestDistance) {
          closestDistance = distance;
          closest = node;
        }
      });
      const anchor = closest as SphereNode | null;
      const labelRadius = 1.16;
      if (!anchor) return [targetX * labelRadius, 0, targetZ * labelRadius];
      return [
        anchor.position[0] * anchor.radiusJitter * labelRadius,
        anchor.position[1] * anchor.radiusJitter * labelRadius,
        anchor.position[2] * anchor.radiusJitter * labelRadius,
      ];
    });

    return { perRegion, neutralEdgeIndices, anchorPositions };
  }, [nodes, edges]);

  const neutralLinePositions = useMemo(() => {
    const array = new Float32Array(clusters.neutralEdgeIndices.length * 6);
    clusters.neutralEdgeIndices.forEach(([a, b], i) => {
      const from = nodes[a];
      const to = nodes[b];
      if (!from || !to) return;
      const offset = i * 6;
      array[offset] = from.position[0] * from.radiusJitter;
      array[offset + 1] = from.position[1] * from.radiusJitter;
      array[offset + 2] = from.position[2] * from.radiusJitter;
      array[offset + 3] = to.position[0] * to.radiusJitter;
      array[offset + 4] = to.position[1] * to.radiusJitter;
      array[offset + 5] = to.position[2] * to.radiusJitter;
    });
    return array;
  }, [clusters, nodes]);

  useFrame((state, delta) => {
    const weight = journeyState.weight.typography;
    const group = groupRef.current;
    if (group) group.visible = weight > 0.001;

    if (glowRef.current) {
      const material = glowRef.current.material as MeshBasicMaterial;
      material.opacity = damp(material.opacity, 0.07 * weight, 4, delta);
    }

    const pointer = journeyState.pointer;
    tilt.current.x = damp(tilt.current.x, pointer.y * 0.1, 3, delta);
    tilt.current.y = damp(tilt.current.y, pointer.x * 0.14, 3, delta);

    // Portrait phones' narrower horizontal FOV can clip the outer nodes even
    // after `objectScale` — only below the desktop tier, keep re-fitting the
    // whole sphere to whatever width is actually visible right now.
    let targetFit = objectScale;
    if (quality !== "high") {
      const viewport = state.viewport.getCurrentViewport(state.camera, [0, 0, 0], state.size);
      const worldWidth = SPHERE_RADIUS * 2 * 1.25;
      targetFit = Math.min(objectScale, (viewport.width * 0.92) / worldWidth);
    }
    fitScale.current = damp(fitScale.current, Math.max(targetFit, 0.001), 4, delta);
    if (group) group.scale.setScalar(fitScale.current);

    // Click-pin + release-on-scroll — a fresh pin is recorded against the
    // scroll position it happened at; scrolling far enough away from that
    // position (or leaving the chapter entirely) releases it back to
    // scroll control, so click and scroll never fight for the same state.
    const local = clamp(journeyState.progress.typography);
    const pinnedIndex = disciplineFocus.pinned;
    if (pinnedIndex !== null && pinnedIndex !== lastPinned.current) {
      pinBaseProgress.current = local;
    }
    lastPinned.current = pinnedIndex;
    if (weight <= 0.001) {
      if (pinnedIndex !== null) disciplineFocus.pinned = null;
      pinBaseProgress.current = null;
    } else if (
      pinnedIndex !== null &&
      pinBaseProgress.current !== null &&
      Math.abs(local - pinBaseProgress.current) > PIN_RELEASE_DISTANCE
    ) {
      disciplineFocus.pinned = null;
      pinBaseProgress.current = null;
    }
    // A click's pin takes priority over scroll — see disciplineFocus.ts.
    const effectivePin = disciplineFocus.pinned;

    // A soft rise/fall envelope per third (not a hard cut at its boundary)
    // so scroll-driven transitions between disciplines cross-fade smoothly.
    const envelope = (index: number) => {
      const start = index / DISCIPLINE_COUNT;
      const end = (index + 1) / DISCIPLINE_COUNT;
      const span = Math.max(end - start, 0.0001);
      const t = clamp((local - start) / span);
      return smoothstep(0, 0.3, t) * (1 - smoothstep(0.7, 1, t));
    };

    let activeIndex = 0;
    let activeStrength = 0;
    for (let i = 0; i < DISCIPLINE_COUNT; i += 1) {
      const isPinned = effectivePin === i;
      const activity = Math.max(envelope(i), isPinned ? 1 : 0);
      activityRef.current[i] = activity;
      if (activity > activeStrength) {
        activeStrength = activity;
        activeIndex = i;
      }
    }

    // Tint the ambient glow shell toward the active discipline's own
    // accent (falling back to a neutral warm glow once nothing is active),
    // so "the corresponding accent colour applied to the sphere glow" is
    // never just the node/edge colours alone.
    if (glowRef.current) {
      glowTintTarget.set(activeStrength > 0.05 ? DISCIPLINE_ACCENTS[activeIndex] ?? "#ffd9a0" : "#ffd9a0");
      glowTint.current.lerp(glowTintTarget, Math.min(1, delta * 3));
      const material = glowRef.current.material as MeshBasicMaterial;
      material.color.copy(glowTint.current);
    }

    // Rotate the whole sphere so the active discipline's cluster turns to
    // face the camera, and simulate "camera moving toward the focal point"
    // by dollying this group closer instead of the shared camera rig (see
    // the component doc comment above for why).
    const targetAngle = -(REGION_CENTER_ANGLES[activeIndex] ?? 0);
    rotationY.current = damp(rotationY.current, targetAngle, 2.2, delta);
    dolly.current = damp(dolly.current, activeStrength * 0.18, 3, delta);

    if (sphereRef.current) {
      sphereRef.current.rotation.x = tilt.current.x;
      sphereRef.current.rotation.y = rotationY.current + tilt.current.y + state.clock.elapsedTime * 0.015;
      sphereRef.current.position.z = dolly.current;
      const idleBreath = 1 + Math.sin(state.clock.elapsedTime * 0.4) * 0.015;
      sphereRef.current.scale.setScalar(idleBreath + activeStrength * 0.04);
    }
  });

  return (
    <group ref={groupRef} scale={objectScale}>
      <group ref={sphereRef}>
        <mesh ref={glowRef}>
          <sphereGeometry args={[SPHERE_RADIUS * 0.72, 32, 32]} />
          <meshBasicMaterial transparent opacity={0} color="#ffd9a0" depthWrite={false} />
        </mesh>
        <NeutralLattice positions={neutralLinePositions} />
        {clusters.perRegion.map((cluster, region) => (
          <DisciplineCluster
            key={`discipline-cluster-${region}`}
            region={region}
            nodes={cluster.nodes}
            edges={cluster.edges}
            activityRef={activityRef}
          />
        ))}
        {clusters.anchorPositions.map((position, region) => (
          <DisciplineLabel
            key={`discipline-label-${region}`}
            region={region}
            position={position}
            activityRef={activityRef}
          />
        ))}
      </group>
    </group>
  );
}
