"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  LineBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  SpriteMaterial,
  TorusGeometry,
  type Group,
  type Mesh,
  type Sprite,
} from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { clamp, damp, smoothstep } from "@/lib/motion/mathUtils";
import { networkFocus } from "@/lib/motion/networkFocus";
import { technologyNetworkNodes } from "@/data/journey";
import { SCENE_TIER_CONFIG, tieredParticleCount, type SceneQuality } from "@/lib/three/deviceTiers";
import { getGlowTexture, getStudioEnv } from "@/lib/three/studioEnv";

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
 * occupy on tablet/mobile. */
const MOBILE_FIT_MARGIN = 0.92;

/** On wide screens the network sits in the open right half, clear of the
 * chapter's heading and tags (portrait keeps it centred). */
const LANDSCAPE_OFFSET_X = 1.9;

/** Light pulses travelling from the hub out to a node and back — tiered
 * down for mobile/tablet, skipped on the lowest tier entirely. */
const TRAVELER_COUNT: Record<SceneQuality, number> = { high: 6, medium: 3, low: 0 };

const CYAN = new Color("#67e8f9");
const HOT = new Color("#e0fbff");

/**
 * Chapter 04 — How We Build: the real technology stack
 * (src/data/technology.ts, `technologyNetworkNodes`) as a network around a
 * central hub.
 *
 * - Hub: a bright cyan core inside two counter-turning titanium rings and a
 *   graphite collar, with a soft glow behind — a precise "platform" core.
 * - Nodes: small glowing glass nodes (a lit core with a soft halo sprite
 *   and a fine ring), each appearing in turn as the chapter scrolls in.
 * - Links: light lines that are brightest at the hub and fade out towards
 *   the nodes, so the outer ends — where they pass the chapter's heading —
 *   stay faint.
 * - Light pulses travel along the links, from the hub to a node and back.
 * - Hovering a technology tag in the section (`networkFocus`) lights its
 *   node: it grows and brightens, its link glows, and the pulses head there.
 *
 * Ambient "synapse dust" adds depth, the graph tilts towards the pointer,
 * and the hub brightens the nearer the pointer is to the centre. Everything
 * fades with the chapter's weight. Physical materials take soft studio
 * reflections (shared env map, applied per material).
 */
export function NeuralScene({ quality }: NeuralSceneProps) {
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const landscape = size.width / Math.max(size.height, 1) >= 1.05;
  const groupRef = useRef<Group>(null);
  const hubRef = useRef<Group>(null);
  const ringARef = useRef<Mesh>(null);
  const ringBRef = useRef<Mesh>(null);
  const hubGlowRef = useRef<Sprite>(null);
  const dustHandle = useRef<ParticleSystemHandle>(null);
  const dustInitialized = useRef(false);
  const nodeRefs = useRef<Array<Group | null>>([]);
  const nodeRingRefs = useRef<Array<Mesh | null>>([]);
  const travelerRefs = useRef<Array<Sprite | null>>([]);
  const tilt = useRef({ x: 0, y: 0 });
  const fitScale = useRef(1);
  const focusLevel = useRef<number[]>(technologyNetworkNodes.map(() => 0));

  const lite = quality === "low";
  const dustCount = tieredParticleCount(900, quality);
  const sceneScale = BASE_SCENE_SCALE * SCENE_TIER_CONFIG[quality].objectScale;
  const travelerCount = TRAVELER_COUNT[quality];
  const nodeCount = technologyNetworkNodes.length;
  const env = useMemo(() => getStudioEnv(gl), [gl]);

  const nodePositions = useMemo(
    () => technologyNetworkNodes.map((n) => [n.position[0] * sceneScale, n.position[1] * sceneScale, n.position[2] * sceneScale] as const),
    [sceneScale]
  );

  const mats = useMemo(() => {
    const physical = (p: ConstructorParameters<typeof MeshPhysicalMaterial>[0]) =>
      new MeshPhysicalMaterial({ envMap: env, transparent: true, opacity: 0, ...p });
    return {
      titanium: physical({ color: "#c7cad0", roughness: 0.22, metalness: 1, envMapIntensity: 1.25 }),
      graphite: physical({ color: "#1c1f26", roughness: 0.25, metalness: 0.9, clearcoat: 0.7, envMapIntensity: 1 }),
      hubCore: new MeshStandardMaterial({ color: "#c9fbff", emissive: "#22d3ee", emissiveIntensity: 2.2, transparent: true, opacity: 0 }),
      hubGlow: new SpriteMaterial({ map: getGlowTexture(), color: "#22d3ee", transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
      links: new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, blending: AdditiveBlending, depthWrite: false }),
    };
  }, [env]);

  const travelerMats = useMemo(
    () =>
      Array.from(
        { length: travelerCount },
        () => new SpriteMaterial({ map: getGlowTexture(), color: "#a5f3fc", transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false })
      ),
    [travelerCount]
  );
  const tmp = useMemo(() => ({ hub: new Color(), tip: new Color() }), []);

  /** Per-node materials, so each can light on its own. */
  const nodeMats = useMemo(
    () =>
      technologyNetworkNodes.map(() => ({
        core: new MeshPhysicalMaterial({
          envMap: env,
          color: "#e9fdff",
          emissive: "#22d3ee",
          emissiveIntensity: 0.8,
          roughness: 0.15,
          clearcoat: 1,
          envMapIntensity: 1,
          transparent: true,
          opacity: 0,
        }),
        glow: new SpriteMaterial({ map: getGlowTexture(), color: "#22d3ee", transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
        ring: new MeshStandardMaterial({ color: "#a5f3fc", emissive: "#67e8f9", emissiveIntensity: 0.6, transparent: true, opacity: 0 }),
      })),
    [env]
  );

  const geo = useMemo(() => {
    const links = new BufferGeometry();
    const positions = new Float32Array(nodeCount * 6);
    nodePositions.forEach((p, i) => positions.set([0, 0, 0, ...p], i * 6));
    links.setAttribute("position", new BufferAttribute(positions, 3));
    links.setAttribute("color", new BufferAttribute(new Float32Array(nodeCount * 6), 3));
    return {
      links,
      hubCore: new SphereGeometry(0.13, 40, 24),
      hubCollar: new TorusGeometry(0.2, 0.03, 16, 96),
      ringA: new TorusGeometry(0.32, 0.007, 10, 128),
      ringB: new TorusGeometry(0.4, 0.005, 10, 128),
      node: new SphereGeometry(0.065, 28, 18),
      nodeRing: new TorusGeometry(0.13, 0.0035, 8, 64),
    };
  }, [nodePositions, nodeCount]);

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
      nodeMats.forEach((n) => [n.core, n.glow, n.ring].forEach((m) => m.dispose()));
      travelerMats.forEach((m) => m.dispose());
      Object.values(geo).forEach((g) => g.dispose());
    },
    [mats, nodeMats, travelerMats, geo]
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

      // Below the desktop tier, keep re-fitting the whole graph to the width
      // actually visible (a portrait phone's narrow horizontal FOV), on top
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
    if (weight <= 0.001) return;

    if (!dustInitialized.current) {
      const positions = dustHandle.current?.positions;
      if (positions) {
        for (let i = 0; i < positions.length / 3; i += 1) {
          const radius = 1 + Math.random() * 3.4;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta) * sceneScale;
          positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * sceneScale * 0.6;
          positions[i * 3 + 2] = radius * Math.cos(phi) * sceneScale;
        }
        const attribute = dustHandle.current?.points?.geometry.attributes.position as BufferAttribute | undefined;
        if (attribute) attribute.needsUpdate = true;
        dustInitialized.current = true;
      }
    }
    const dustMaterial = dustHandle.current?.material;
    if (dustMaterial) dustMaterial.opacity = damp(dustMaterial.opacity, 0.3 * weight, 4, delta);

    // Nodes appear in turn as the chapter scrolls in; a hovered tag's node
    // comes forward.
    const focusId = networkFocus.id;
    const appear = technologyNetworkNodes.map((_, i) => smoothstep(i * 0.055, i * 0.055 + 0.2, progress));
    let appearAverage = 0;
    let focusedIndex = -1;
    const colors = geo.links.getAttribute("color") as BufferAttribute;
    technologyNetworkNodes.forEach((node, i) => {
      const a = appear[i] ?? 0;
      appearAverage += a;
      const focus = (focusLevel.current[i] = damp(focusLevel.current[i] ?? 0, node.id === focusId ? 1 : 0, 7, delta));
      if (node.id === focusId) focusedIndex = i;
      const m = nodeMats[i];
      const g = nodeRefs.current[i];
      if (!m || !g) return;
      g.scale.setScalar(damp(g.scale.x, 0.55 + a * 0.55 + focus * 0.6, 6, delta));
      m.core.opacity = damp(m.core.opacity, a * weight, 5, delta);
      m.core.emissiveIntensity = 0.7 + a * 0.6 + focus * 2.2;
      m.glow.opacity = damp(m.glow.opacity, (0.35 + focus * 0.65) * a * weight, 5, delta);
      m.ring.opacity = damp(m.ring.opacity, (0.45 + focus * 0.55) * a * weight, 5, delta);
      const ring = nodeRingRefs.current[i];
      if (ring) ring.rotation.z += delta * (0.4 + focus * 2);
      // Link: bright at the hub, fading towards the node (brighter when focused).
      const strength = a * weight * (0.32 + focus * 0.6);
      const hub = tmp.hub.copy(HOT).lerp(CYAN, 0.3).multiplyScalar(strength);
      const tip = tmp.tip.copy(CYAN).multiplyScalar(strength * (0.12 + focus * 0.7));
      colors.setXYZ(i * 2, hub.r, hub.g, hub.b);
      colors.setXYZ(i * 2 + 1, tip.r, tip.g, tip.b);
    });
    colors.needsUpdate = true;
    appearAverage /= Math.max(nodeCount, 1);

    // Light pulses: hub → node → hub, only once that node has appeared;
    // with a tag hovered, half of them head to its node.
    travelerRefs.current.forEach((sprite, i) => {
      if (!sprite) return;
      const target = focusedIndex >= 0 && i % 2 === 0 ? focusedIndex : i % nodeCount;
      const p = nodePositions[target];
      if (!p) return;
      const cycle = (time * (0.45 + i * 0.07) + i * 0.6) % 2;
      const k = cycle < 1 ? cycle : 2 - cycle;
      sprite.position.set(p[0] * k, p[1] * k, p[2] * k);
      sprite.scale.setScalar(0.16 + Math.sin(k * Math.PI) * 0.08);
      sprite.material.opacity = damp(sprite.material.opacity, (appear[target] ?? 0) * weight * 0.9, 5, delta);
    });

    // Hub.
    const pulse = (1 + Math.sin(time * 0.5) * 0.05) * (0.92 + appearAverage * 0.2) * pointerEnergy;
    const fade = (m: { opacity: number }, target: number) => {
      m.opacity = damp(m.opacity, target * weight, 4, delta);
    };
    fade(mats.titanium, 0.95);
    fade(mats.graphite, 0.95);
    fade(mats.hubCore, 1);
    fade(mats.hubGlow, 0.6);
    mats.hubCore.emissiveIntensity = 1.6 + pointerEnergy * 1.2 + (focusedIndex >= 0 ? 0.6 : 0);
    if (hubRef.current) hubRef.current.scale.setScalar(damp(hubRef.current.scale.x, pulse, 4, delta));
    if (ringARef.current) ringARef.current.rotation.z += delta * 0.5;
    if (ringBRef.current) ringBRef.current.rotation.z -= delta * 0.32;
    if (hubGlowRef.current) hubGlowRef.current.scale.setScalar(1.5 * pulse);
  });

  return (
    <group ref={groupRef} position={[landscape ? LANDSCAPE_OFFSET_X : 0, 0, 0]}>
      <ParticleSystem ref={dustHandle} count={dustCount} size={0.02} color="#67e8f9" opacity={0} additive />

      <lineSegments geometry={geo.links} material={mats.links} />

      {/* The hub: cyan core, graphite collar, two titanium rings, glow. */}
      <sprite ref={hubGlowRef} material={mats.hubGlow} scale={1.5} />
      <group ref={hubRef}>
        <mesh geometry={geo.hubCore} material={mats.hubCore} />
        <mesh geometry={geo.hubCollar} material={mats.graphite} rotation={[Math.PI / 2, 0, 0]} />
        <group rotation={[1.1, 0.3, 0]}>
          <mesh ref={ringARef} geometry={geo.ringA} material={mats.titanium} />
        </group>
        <group rotation={[0.4, 1.2, 0.2]}>
          <mesh ref={ringBRef} geometry={geo.ringB} material={mats.titanium} />
        </group>
      </group>

      {/* Technology nodes. */}
      {technologyNetworkNodes.map((node, i) => {
        const m = nodeMats[i];
        const p = nodePositions[i];
        if (!m || !p) return null;
        return (
          <group
            key={node.id}
            position={[...p]}
            ref={(g) => {
              nodeRefs.current[i] = g;
            }}
          >
            <sprite material={m.glow} scale={0.6} />
            <mesh geometry={geo.node} material={m.core} />
            {lite ? null : (
              <mesh
                geometry={geo.nodeRing}
                material={m.ring}
                rotation={[Math.PI / 2.4, 0, 0]}
                ref={(mesh) => {
                  nodeRingRefs.current[i] = mesh;
                }}
              />
            )}
          </group>
        );
      })}

      {Array.from({ length: travelerCount }, (_, i) => (
        <sprite
          key={`pulse-${i}`}
          material={travelerMats[i]}
          ref={(sprite) => {
            travelerRefs.current[i] = sprite;
          }}
        />
      ))}
    </group>
  );
}
