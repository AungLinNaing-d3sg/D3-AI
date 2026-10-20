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
import { damp } from "@/lib/motion/mathUtils";
import { aboutTeamNodes, aboutTeamRanges } from "@/data/journey";
import { SCENE_TIER_CONFIG, tieredParticleCount, type SceneQuality } from "@/lib/three/deviceTiers";
import { getGlowTexture, getStudioEnv } from "@/lib/three/studioEnv";
import { roundedBox } from "@/components/three/scenes/vision/robotGeometry";

interface AboutSceneProps {
  quality: SceneQuality;
}

/** A short, still skyline — evokes the company's Singapore base without
 * depicting a literal building. Fixed heights (no randomness) so every load
 * composes the same. */
const SKYLINE = [
  { x: -2.55, h: 0.7, w: 0.26 },
  { x: -1.95, h: 1.15, w: 0.22 },
  { x: -1.4, h: 0.85, w: 0.3 },
  { x: -0.7, h: 1.45, w: 0.24 },
  { x: 0.05, h: 1.0, w: 0.32 },
  { x: 0.75, h: 1.3, w: 0.22 },
  { x: 1.4, h: 0.8, w: 0.28 },
  { x: 2.0, h: 1.05, w: 0.24 },
  { x: 2.6, h: 0.65, w: 0.26 },
] as const;
const SKYLINE_BASE_Y = -1.45;
const SKYLINE_Z = -3.4;

/** Two wide champagne-titanium orbit rings around the emblem. */
const ORBIT_RINGS = [
  { radius: 1.55, tube: 0.008, tiltX: Math.PI / 2.6, tiltZ: 0.32, speed: 0.05 },
  { radius: 1.92, tube: 0.006, tiltX: Math.PI / 3.4, tiltZ: -0.55, speed: -0.035 },
] as const;

/** The three disciplines (Data, Dynamics, Digital — the Our Approach
 * colours) as fine gimbal rings close around the core, each with a bead. */
const DISCIPLINE_RINGS = [
  { color: "#00d2ff", radius: 0.66, tilt: [1.2, 0.2, 0.3] as const, speed: 0.32 },
  { color: "#ff4d2d", radius: 0.74, tilt: [0.35, 1.0, -0.2] as const, speed: -0.24 },
  { color: "#00e676", radius: 0.82, tilt: [1.75, -0.5, 0.6] as const, speed: 0.18 },
];

const CORE_RADIUS = 0.46;
/** The whole emblem sits a little further back, so the About copy and
 * cards in front of it stay the focus. */
const EMBLEM_Z = -0.7;
/** On wide screens the composition drops into the open space below the
 * About copy rather than sitting behind it (portrait keeps it centred). */
const LANDSCAPE_OFFSET_Y = -0.85;

/**
 * Chapter 02 — About Us / Who we are. The intro settles into the company's
 * "identity core": a glazed white ceramic sphere with a glowing D3-SG orange
 * equator, held inside three fine gimbal rings in the Data / Dynamics /
 * Digital colours (the three disciplines fused into one core), with a warm
 * glow behind it. The real leadership team (src/data/team.ts) orbits it as
 * small glowing ceramic nodes — the one matching the leader card on screen
 * lights up and grows, as before — linked to the core by soft light lines
 * that fade towards the centre. Two wide champagne-titanium rings turn
 * slowly around it, warm motes drift up, and a low skyline of slender
 * graphite towers with lit edges grounds it, evoking the Singapore base.
 *
 * Physical materials take soft studio reflections (shared env map, applied
 * per material). Everything fades with the chapter's weight; the
 * composition sits back in depth so the copy in front stays clear — on
 * wide screens it drops into the open space below the copy, and on
 * portrait screens (copy over it) it sits further back, smaller and at half
 * strength. Mobile drops the gimbal beads, node halos and one orbit ring.
 */
export function AboutScene({ quality }: AboutSceneProps) {
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const landscape = size.width / Math.max(size.height, 1) >= 1.05;
  const groupRef = useRef<Group>(null);
  const emblemRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);
  const glowRef = useRef<Sprite>(null);
  const disciplineRefs = useRef<Array<Group | null>>([]);
  const orbitRefs = useRef<Array<Mesh | null>>([]);
  const nodeRefs = useRef<Array<Group | null>>([]);
  const haloRefs = useRef<Array<Mesh | null>>([]);
  const motesHandle = useRef<ParticleSystemHandle>(null);
  const motesInitialized = useRef(false);

  const lite = quality === "low";
  const moteCount = tieredParticleCount(420, quality);
  const objectScale = SCENE_TIER_CONFIG[quality].objectScale;
  const orbitCount = lite ? 1 : ORBIT_RINGS.length;

  const env = useMemo(() => getStudioEnv(gl), [gl]);

  /** Materials, each with the opacity it fades up to at full weight. */
  const mats = useMemo(() => {
    const physical = (p: ConstructorParameters<typeof MeshPhysicalMaterial>[0]) =>
      new MeshPhysicalMaterial({ envMap: env, transparent: true, opacity: 0, ...p });
    const ceramic = physical({ color: "#f1f0eb", roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1 });
    const titanium = physical({ color: "#d9cbb0", roughness: 0.25, metalness: 1, envMapIntensity: 1.2 });
    const graphite = physical({ color: "#1b1e25", roughness: 0.28, metalness: 0.9, clearcoat: 0.6, envMapIntensity: 0.9 });
    const band = new MeshStandardMaterial({ color: "#f14a30", emissive: "#ff5a3c", emissiveIntensity: 1.6, transparent: true, opacity: 0 });
    const towerLight = new MeshStandardMaterial({ color: "#ffb48a", emissive: "#ff9a6a", emissiveIntensity: 1.2, transparent: true, opacity: 0 });
    const nodeCore = new MeshStandardMaterial({ color: "#ffe0d6", emissive: "#fd6a50", emissiveIntensity: 0.6, transparent: true, opacity: 0, roughness: 0.3 });
    const glow = new SpriteMaterial({ map: getGlowTexture(), color: "#ffb28a", transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
    const disciplines = DISCIPLINE_RINGS.map(
      (r) => new MeshStandardMaterial({ color: r.color, emissive: r.color, emissiveIntensity: 0.9, transparent: true, opacity: 0, metalness: 0.4, roughness: 0.3 })
    );
    const halo = new MeshStandardMaterial({ color: "#ffd9a0", emissive: "#ffb070", emissiveIntensity: 0.6, transparent: true, opacity: 0 });
    const spoke = new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
    const nodeGlow = new SpriteMaterial({ map: getGlowTexture(), color: "#ff8a5c", transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
    return { ceramic, titanium, graphite, band, towerLight, nodeCore, glow, disciplines, halo, spoke, nodeGlow };
  }, [env]);

  /** Per-node materials, so each can light on its own. */
  const nodeMats = useMemo(
    () => aboutTeamNodes.map(() => ({ core: mats.nodeCore.clone(), glow: mats.nodeGlow.clone(), halo: mats.halo.clone() })),
    [mats]
  );

  const geo = useMemo(() => {
    const spokePositions = new Float32Array(aboutTeamNodes.length * 6);
    const spokeColors = new Float32Array(aboutTeamNodes.length * 6);
    const warm = new Color("#e8b673");
    aboutTeamNodes.forEach((node, i) => {
      spokePositions.set([0, 0, 0, ...node.position], i * 6);
      // Faint at the core, warm at the node: the line reads as light
      // travelling out rather than a drawn stroke.
      spokeColors.set([warm.r * 0.08, warm.g * 0.08, warm.b * 0.08, warm.r, warm.g, warm.b], i * 6);
    });
    const spokes = new BufferGeometry();
    spokes.setAttribute("position", new BufferAttribute(spokePositions, 3));
    spokes.setAttribute("color", new BufferAttribute(spokeColors, 3));
    return {
      core: new SphereGeometry(CORE_RADIUS, 64, 40),
      band: new TorusGeometry(CORE_RADIUS * 1.004, 0.016, 12, 128),
      disciplines: DISCIPLINE_RINGS.map((r) => new TorusGeometry(r.radius, 0.0045, 8, 160)),
      bead: new SphereGeometry(0.03, 16, 12),
      orbits: ORBIT_RINGS.map((r) => new TorusGeometry(r.radius, r.tube, 10, 180)),
      node: new SphereGeometry(0.1, 32, 20),
      nodeHalo: new TorusGeometry(0.2, 0.005, 8, 48),
      towers: SKYLINE.map((t) => roundedBox(t.w, t.h, t.w, 0.04, 2)),
      edge: roundedBox(0.012, 1, 0.012, 0.004, 1),
      spokes,
    };
  }, []);

  useEffect(
    () => () => {
      [mats.ceramic, mats.titanium, mats.graphite, mats.band, mats.towerLight, mats.nodeCore, mats.glow, mats.halo, mats.spoke, mats.nodeGlow, ...mats.disciplines].forEach((m) => m.dispose());
      nodeMats.forEach((n) => [n.core, n.glow, n.halo].forEach((m) => m.dispose()));
      [geo.core, geo.band, geo.bead, geo.node, geo.nodeHalo, geo.edge, geo.spokes, ...geo.disciplines, ...geo.orbits, ...geo.towers].forEach((g) => g.dispose());
    },
    [mats, nodeMats, geo]
  );

  useFrame((state, delta) => {
    const weight = journeyState.weight.about;
    const progress = journeyState.progress.about;
    const group = groupRef.current;
    const time = state.clock.elapsedTime;
    if (group) {
      group.visible = weight > 0.001;
      group.rotation.y += delta * 0.05;
    }
    if (weight <= 0.001) return;

    // Portrait screens put the copy right over the emblem: keep it quieter.
    const presence = landscape ? 1 : 0.5;
    const fadeTo = (m: { opacity: number }, target: number, rate = 4) => {
      m.opacity = damp(m.opacity, target * weight * presence, rate, delta);
    };
    fadeTo(mats.ceramic, 1);
    fadeTo(mats.titanium, 0.9);
    fadeTo(mats.graphite, 0.72);
    fadeTo(mats.band, 1);
    fadeTo(mats.towerLight, 0.7);
    fadeTo(mats.glow, 0.55, 3);
    fadeTo(mats.spoke, 0.55);
    mats.disciplines.forEach((m) => fadeTo(m, 0.75));
    mats.band.emissiveIntensity = 1.4 + Math.sin(time * 1.3) * 0.25;

    // The core settles in with the chapter and breathes slowly.
    const coreScale = (0.85 + weight * 0.15) * (1 + Math.sin(time * 0.6) * 0.012) * (landscape ? 1 : 0.8);
    if (emblemRef.current) emblemRef.current.scale.setScalar(damp(emblemRef.current.scale.x, coreScale, 4, delta));
    if (coreRef.current) coreRef.current.rotation.y += delta * 0.08;
    if (glowRef.current) glowRef.current.scale.setScalar(2.6 * (1 + Math.sin(time * 0.35) * 0.05));
    disciplineRefs.current.forEach((ring, i) => {
      if (ring) ring.rotation.z += delta * (DISCIPLINE_RINGS[i]?.speed ?? 0);
    });
    orbitRefs.current.forEach((mesh, i) => {
      const layout = ORBIT_RINGS[i];
      if (!mesh || !layout) return;
      mesh.rotation.z += delta * layout.speed;
      mesh.rotation.x = layout.tiltX + Math.sin(time * 0.12 + i) * 0.04;
    });

    // The leader on screen lights up, exactly as before.
    aboutTeamNodes.forEach((_node, index) => {
      const range = aboutTeamRanges[index];
      const node = nodeRefs.current[index];
      const m = nodeMats[index];
      if (!range || !node || !m) return;
      const isActive = progress >= range.start && progress < range.end;
      const target = isActive ? 1 : 0.5;
      fadeTo(m.core, target, 5);
      m.core.emissiveIntensity = damp(m.core.emissiveIntensity, isActive ? 1.4 : 0.45, 5, delta);
      fadeTo(m.glow, isActive ? 0.9 : 0.3, 5);
      fadeTo(m.halo, target * 0.8, 5);
      node.scale.setScalar(damp(node.scale.x, isActive ? 1.2 : 0.85, 6, delta));
      const halo = haloRefs.current[index];
      if (halo) {
        halo.rotation.z += delta * (isActive ? 0.6 : 0.15);
        halo.scale.setScalar(damp(halo.scale.x, isActive ? 1.3 : 1, 6, delta));
      }
    });

    // Warm motes drifting up around the emblem.
    if (!motesInitialized.current) {
      const positions = motesHandle.current?.positions;
      if (positions) {
        for (let i = 0; i < positions.length / 3; i += 1) {
          const radius = 0.8 + Math.random() * 2.6;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.7;
          positions[i * 3 + 2] = radius * Math.cos(phi) * 0.65 - 1;
        }
        const attribute = motesHandle.current?.points?.geometry.attributes.position as BufferAttribute | undefined;
        if (attribute) attribute.needsUpdate = true;
        motesInitialized.current = true;
      }
    }
    const motesMaterial = motesHandle.current?.material;
    if (motesMaterial) motesMaterial.opacity = damp(motesMaterial.opacity, 0.4 * weight, 4, delta);
    const motes = motesHandle.current?.positions;
    if (motes) {
      for (let i = 0; i < motes.length / 3; i += 1) {
        const y = (motes[i * 3 + 1] ?? 0) + delta * (0.1 + (i % 5) * 0.02);
        motes[i * 3 + 1] = y > 2.2 ? -2.2 : y;
      }
      const attribute = motesHandle.current?.points?.geometry.attributes.position as BufferAttribute | undefined;
      if (attribute) attribute.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef} scale={objectScale} position={[0, landscape ? LANDSCAPE_OFFSET_Y : 0, 0]}>
      <ParticleSystem ref={motesHandle} count={moteCount} size={0.022} color="#ffd9a0" opacity={0} />

      {/* Skyline: slender graphite towers with a lit edge and a rooftop light. */}
      {SKYLINE.map((t, i) => (
        <group key={`tower-${i}`} position={[t.x, SKYLINE_BASE_Y + t.h / 2, SKYLINE_Z - (i % 3) * 0.25]}>
          <mesh geometry={geo.towers[i]} material={mats.graphite} />
          <mesh geometry={geo.edge} material={mats.towerLight} position={[t.w / 2 - 0.01, 0, t.w / 2]} scale={[1, t.h * 0.86, 1]} />
          <mesh geometry={geo.bead} material={mats.towerLight} position={[0, t.h / 2 + 0.03, 0]} scale={0.6} />
        </group>
      ))}

      <group position={[0, 0, landscape ? EMBLEM_Z : EMBLEM_Z - 0.8]}>
        <sprite ref={glowRef} material={mats.glow} position={[0, 0, -0.4]} scale={2.6} />

        <group ref={emblemRef}>
          {/* The identity core: glazed ceramic with a glowing orange equator. */}
          <mesh ref={coreRef} geometry={geo.core} material={mats.ceramic} />
          <mesh geometry={geo.band} material={mats.band} rotation={[Math.PI / 2, 0, 0.18]} />

          {/* Data / Dynamics / Digital gimbal rings, each with a bead. */}
          {DISCIPLINE_RINGS.map((r, i) => (
            <group key={r.color} rotation={[...r.tilt]}>
              <group
                ref={(node) => {
                  disciplineRefs.current[i] = node;
                }}
              >
                <mesh geometry={geo.disciplines[i]} material={mats.disciplines[i]} />
                {lite ? null : <mesh geometry={geo.bead} material={mats.disciplines[i]} position={[r.radius, 0, 0]} />}
              </group>
            </group>
          ))}
        </group>

        {/* Wide champagne-titanium orbits. */}
        {ORBIT_RINGS.slice(0, orbitCount).map((layout, i) => (
          <mesh
            key={`orbit-${i}`}
            geometry={geo.orbits[i]}
            material={mats.titanium}
            rotation={[layout.tiltX, 0, layout.tiltZ]}
            ref={(mesh) => {
              orbitRefs.current[i] = mesh;
            }}
          />
        ))}

        {/* Soft light lines from the core out to each leader. */}
        <lineSegments geometry={geo.spokes} material={mats.spoke} />

        {/* The leadership team: glowing ceramic nodes with a halo ring. */}
        {aboutTeamNodes.map((node, index) => {
          const m = nodeMats[index];
          if (!m) return null;
          return (
            <group
              key={node.id}
              position={node.position}
              ref={(g) => {
                nodeRefs.current[index] = g;
              }}
            >
              <sprite material={m.glow} scale={0.75} />
              <mesh geometry={geo.node} material={m.core} />
              {lite ? null : (
                <mesh
                  geometry={geo.nodeHalo}
                  material={m.halo}
                  ref={(mesh) => {
                    haloRefs.current[index] = mesh;
                  }}
                />
              )}
            </group>
          );
        })}
      </group>
    </group>
  );
}
