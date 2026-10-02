"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SCENE_TIER_CONFIG, tieredParticleCount, type SceneQuality } from "@/lib/three/deviceTiers";
import { BACKGROUND_OBJECTS, BACKGROUND_SECTIONS, poseFor, type BackgroundObject, type BackgroundSection } from "./scenePoses";

/**
 * Homepage 3D backdrop: one quiet object per discipline, in a pale "clay"
 * finish with brand-red accents so it reads as part of the light UI rather
 * than competing with it.
 *
 * - Data    → rising bars on a plinth (the BI dashboard demo)
 * - Dynamics → three workflow nodes with a packet travelling between them
 *              (the pipeline / approval-flow demos)
 * - Digital → a rounded app screen built from UI blocks (the code-to-app demo)
 *
 * Objects glide to a per-section arrangement (scenePoses.ts) as the reader
 * scrolls, turn slowly with scroll position, and drift a little at idle.
 * With `animate` off (reduced motion) the canvas renders on demand only, and
 * each section's arrangement is applied instantly, without any motion.
 */

const CAMERA_Z = 12;
const COLORS = { clay: "#f1ece6", clayDark: "#e7e0d8", accent: "#ec5a45", soft: "#fbd9cf" };

type Materials = Record<keyof typeof COLORS, THREE.MeshStandardMaterial>;

function useMaterials(): Materials {
  const materials = useMemo(
    () => ({
      clay: new THREE.MeshStandardMaterial({ color: COLORS.clay, roughness: 0.92 }),
      clayDark: new THREE.MeshStandardMaterial({ color: COLORS.clayDark, roughness: 0.9 }),
      accent: new THREE.MeshStandardMaterial({ color: COLORS.accent, roughness: 0.55 }),
      soft: new THREE.MeshStandardMaterial({ color: COLORS.soft, roughness: 0.8 }),
    }),
    []
  );
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);
  return materials;
}

/* ---------- Data: rising bars ---------- */

const BAR_HEIGHTS = [0.7, 1.1, 0.9, 1.5, 2.1];

function DataBars({ m, animate }: { m: Materials; animate: boolean }) {
  const bars = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    if (!animate) return;
    bars.current.forEach((bar, i) => {
      if (!bar) return;
      const s = 1 + Math.sin(clock.elapsedTime * 0.6 + i * 0.9) * 0.05;
      bar.scale.y = s;
      bar.position.y = ((BAR_HEIGHTS[i] ?? 1) * s) / 2;
    });
  });
  return (
    <group position={[0, -0.9, 0]}>
      <RoundedBox args={[3.3, 0.16, 1.3]} radius={0.06} position={[0, -0.08, 0]} material={m.clayDark} />
      {BAR_HEIGHTS.map((h, i) => (
        <RoundedBox
          key={i}
          ref={(el: THREE.Mesh | null) => {
            bars.current[i] = el;
          }}
          args={[0.44, h, 0.44]}
          radius={0.09}
          smoothness={4}
          position={[-1.2 + i * 0.6, h / 2, 0]}
          material={i === BAR_HEIGHTS.length - 1 ? m.accent : m.clay}
        />
      ))}
    </group>
  );
}

/* ---------- Dynamics: workflow nodes with a travelling packet ---------- */

const NODES: [number, number, number][] = [
  [-1.15, 0.65, 0],
  [1.1, 0.25, 0.2],
  [-0.05, -0.95, -0.1],
];
const UP = new THREE.Vector3(0, 1, 0);

function Link({ from, to, m }: { from: THREE.Vector3; to: THREE.Vector3; m: Materials }) {
  const { position, quaternion, length } = useMemo(() => {
    const dir = to.clone().sub(from);
    return {
      position: from.clone().add(to).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize()),
      length: dir.length(),
    };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion} material={m.clayDark}>
      <cylinderGeometry args={[0.05, 0.05, length, 12]} />
    </mesh>
  );
}

function FlowNodes({ m, animate }: { m: Materials; animate: boolean }) {
  const points = useMemo(() => NODES.map((p) => new THREE.Vector3(...p)), []);
  const packet = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!animate || !packet.current) return;
    // 0→1 along node 0→1, 1→2 along node 1→2, then a short pause at the end.
    const t = (clock.elapsedTime * 0.22) % 2.4;
    const leg = Math.min(Math.floor(t), 1);
    const local = Math.min(t - leg, 1);
    const eased = local * local * (3 - 2 * local);
    packet.current.position.lerpVectors(points[leg]!, points[leg + 1]!, eased);
  });
  return (
    <group>
      <Link from={points[0]!} to={points[1]!} m={m} />
      <Link from={points[1]!} to={points[2]!} m={m} />
      {points.map((p, i) => (
        <RoundedBox key={i} args={[0.72, 0.72, 0.72]} radius={0.2} smoothness={4} position={p} material={i === 1 ? m.soft : m.clay} />
      ))}
      <mesh ref={packet} position={points[2]} material={m.accent}>
        <sphereGeometry args={[0.12, 20, 20]} />
      </mesh>
    </group>
  );
}

/* ---------- Digital: an app screen made of UI blocks ---------- */

function DeviceSlab({ m }: { m: Materials }) {
  return (
    <group>
      <RoundedBox args={[2.1, 3.4, 0.2]} radius={0.16} smoothness={4} material={m.clay} />
      <RoundedBox args={[1.7, 0.26, 0.05]} radius={0.05} position={[0, 1.27, 0.12]} material={m.clayDark} />
      <RoundedBox args={[1.7, 0.95, 0.05]} radius={0.06} position={[0, 0.55, 0.12]} material={m.soft} />
      {[0.35, 0.55, 0.45, 0.75].map((h, i) => (
        <RoundedBox key={i} args={[0.24, h, 0.06]} radius={0.03} position={[-0.54 + i * 0.36, 0.14 + h / 2, 0.16]} material={m.accent} />
      ))}
      {[-0.25, -0.6, -0.95].map((y) => (
        <RoundedBox key={y} args={[1.7, 0.24, 0.05]} radius={0.05} position={[0, y, 0.12]} material={m.clayDark} />
      ))}
      <RoundedBox args={[1.7, 0.3, 0.07]} radius={0.07} position={[0, -1.36, 0.13]} material={m.accent} />
    </group>
  );
}

/* ---------- Faint data points in depth ---------- */

function DataPoints({ count, animate }: { count: number; animate: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (Math.random() - 0.5) * 22,
        y: (Math.random() - 0.5) * 13,
        z: -10 + Math.random() * 5,
        speed: 0.05 + Math.random() * 0.08,
        red: i % 7 === 0,
      })),
    [count]
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    const red = new THREE.Color(COLORS.accent);
    const grey = new THREE.Color("#cfc7bf");
    seeds.forEach((seed, i) => instanced.setColorAt(i, seed.red ? red : grey));
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  }, [seeds]);

  useFrame(({ clock }) => {
    const instanced = mesh.current;
    if (!instanced) return;
    const t = animate ? clock.elapsedTime : 0;
    seeds.forEach((seed, i) => {
      const y = ((seed.y + t * seed.speed + 6.5) % 13) - 6.5; // drift upwards, wrap around
      dummy.position.set(seed.x, y, seed.z);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.04, 8, 8]} />
      <meshBasicMaterial transparent opacity={0.32} />
    </instancedMesh>
  );
}

/* ---------- Rig: section-aware arrangement ---------- */

function Rig({ quality, animate }: { quality: SceneQuality; animate: boolean }) {
  const m = useMaterials();
  const { viewport, invalidate } = useThree();
  const groups = useRef<Partial<Record<BackgroundObject, THREE.Group | null>>>({});
  const active = useRef<BackgroundSection>("hero");
  const placed = useRef(false);
  const tier = SCENE_TIER_CONFIG[quality];
  const compact = quality === "low";

  useEffect(() => {
    const sections = BACKGROUND_SECTIONS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) active.current = entry.target.id as BackgroundSection;
        });
        invalidate();
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [invalidate]);

  useFrame(({ clock }, delta) => {
    const scroll = window.scrollY;
    const t = clock.elapsedTime;
    BACKGROUND_OBJECTS.forEach((id, i) => {
      const group = groups.current[id];
      if (!group) return;
      const pose = poseFor(active.current, id, tier.objectScale, compact);
      // Visible size grows with distance, so place relative to the frustum at that depth.
      const depth = (CAMERA_Z - pose.z) / CAMERA_Z;
      const tx = pose.nx * viewport.width * depth;
      const ty = pose.ny * viewport.height * depth + (animate ? Math.sin(t * 0.35 + i * 2) * 0.12 : 0);
      if (animate && placed.current) {
        group.position.x = THREE.MathUtils.damp(group.position.x, tx, 1.6, delta);
        group.position.y = THREE.MathUtils.damp(group.position.y, ty, 1.6, delta);
        group.position.z = THREE.MathUtils.damp(group.position.z, pose.z, 1.6, delta);
        group.scale.setScalar(THREE.MathUtils.damp(group.scale.x, pose.s, 1.6, delta));
        group.rotation.y = THREE.MathUtils.damp(group.rotation.y, pose.ry + scroll * 0.0004 * (i % 2 ? -1 : 1), 2, delta);
        group.rotation.x = 0.18 + Math.sin(t * 0.25 + i) * 0.04;
      } else {
        group.position.set(tx, ty, pose.z);
        group.scale.setScalar(pose.s);
        group.rotation.set(0.18, pose.ry, 0);
      }
    });
    placed.current = true; // first frame snaps into place; later frames glide
  });

  return (
    <>
      <group ref={(el) => { groups.current.data = el; }}>
        <DataBars m={m} animate={animate} />
      </group>
      <group ref={(el) => { groups.current.flow = el; }}>
        <FlowNodes m={m} animate={animate} />
      </group>
      <group ref={(el) => { groups.current.device = el; }}>
        <DeviceSlab m={m} />
      </group>
      <DataPoints count={tieredParticleCount(45, quality)} animate={animate} />
    </>
  );
}

export default function DisciplineScene({ quality, animate }: { quality: SceneQuality; animate: boolean }) {
  return (
    <Canvas
      dpr={SCENE_TIER_CONFIG[quality].dpr}
      frameloop={animate ? "always" : "demand"}
      camera={{ position: [0, 0, CAMERA_Z], fov: 35 }}
      gl={{ antialias: quality !== "low", alpha: true, powerPreference: "low-power" }}
    >
      <hemisphereLight args={["#ffffff", "#f1e7e0", 1.45]} />
      <directionalLight position={[-4, 6, 8]} intensity={1.1} color="#fff6f0" />
      <directionalLight position={[6, -2, 4]} intensity={0.3} color="#ffd9cc" />
      <Rig quality={quality} animate={animate} />
    </Canvas>
  );
}
