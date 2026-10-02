"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { SCENE_TIER_CONFIG, type SceneQuality } from "@/lib/three/deviceTiers";
import { BACKGROUND_OBJECTS, BACKGROUND_SECTIONS, poseFor, type BackgroundObject, type BackgroundSection } from "./scenePoses";

/**
 * Homepage 3D backdrop: a large pearl sphere (clearcoat + a touch of
 * thin-film iridescence) and a small glossy brand-red accent sphere, lit by
 * a procedural studio built from drei `<Lightformer>`s — soft white key
 * from above, warm fill, and a brand-red rim — so reflections look like a
 * real product shot without loading any HDR file (keeps the strict CSP).
 *
 * The studio is rendered once; motion comes from slowly rotating the scene's
 * environment (reflections glide across the surface), a gentle float, and a
 * per-section arrangement (scenePoses.ts) the spheres ease towards as the
 * reader scrolls. With `animate` off (reduced motion) the canvas renders on
 * demand only and each section's arrangement is applied without movement.
 */

const CAMERA_Z = 12;

const PEARL = {
  color: "#ffffff",
  roughness: 0.14,
  metalness: 0.04,
  clearcoat: 1,
  clearcoatRoughness: 0.06,
  iridescence: 0.55,
  iridescenceIOR: 1.25,
  iridescenceThicknessRange: [120, 420] as [number, number],
  envMapIntensity: 1.45,
};

const RED = {
  color: "#e5412d",
  roughness: 0.22,
  metalness: 0.08,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
  envMapIntensity: 1.25,
};

const SEGMENTS: Record<SceneQuality, number> = { high: 96, medium: 64, low: 48 };

function Studio({ resolution }: { resolution: number }) {
  return (
    <Environment resolution={resolution} frames={1}>
      {/* A mid-tone backdrop gives the pearl real light-to-shadow modelling;
          the softboxes then read as crisp studio highlights. */}
      <color attach="background" args={["#b6afa9"]} />
      <Lightformer form="rect" intensity={4} color="#ffffff" position={[0, 6, 1]} rotation-x={Math.PI / 2} scale={[10, 4, 1]} />
      <Lightformer form="rect" intensity={3.2} color="#ffffff" position={[-3.2, 1.5, 6]} scale={[0.9, 4.5, 1]} />
      <Lightformer form="rect" intensity={1.6} color="#ffe2d8" position={[-7, 0, 1]} rotation-y={Math.PI / 2} scale={[4, 10, 1]} />
      <Lightformer form="rect" intensity={3} color="#e5412d" position={[7, -0.5, -1]} rotation-y={-Math.PI / 2} scale={[2, 9, 1]} />
      <Lightformer form="ring" intensity={1.4} color="#ffffff" position={[3, 3, 7]} scale={1.6} />
    </Environment>
  );
}

function Rig({ quality, animate }: { quality: SceneQuality; animate: boolean }) {
  const { viewport, invalidate, scene } = useThree();
  const groups = useRef<Partial<Record<BackgroundObject, THREE.Group | null>>>({});
  const active = useRef<BackgroundSection>("hero");
  const placed = useRef(false);
  const tier = SCENE_TIER_CONFIG[quality];
  const compact = quality === "low";
  const segments = SEGMENTS[quality];

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
    const t = clock.elapsedTime;
    const glide = animate && placed.current;
    BACKGROUND_OBJECTS.forEach((id, i) => {
      const group = groups.current[id];
      if (!group) return;
      const pose = poseFor(active.current, id, tier.objectScale, compact);
      // Visible size grows with distance, so place relative to the frustum at that depth.
      const depth = (CAMERA_Z - pose.z) / CAMERA_Z;
      const tx = pose.nx * viewport.width * depth;
      const ty = pose.ny * viewport.height * depth + (animate ? Math.sin(t * (0.3 + i * 0.15) + i * 1.7) * (0.14 + i * 0.06) : 0);
      if (glide) {
        group.position.x = THREE.MathUtils.damp(group.position.x, tx, 1.4, delta);
        group.position.y = THREE.MathUtils.damp(group.position.y, ty, 1.4, delta);
        group.position.z = THREE.MathUtils.damp(group.position.z, pose.z, 1.4, delta);
        group.scale.setScalar(THREE.MathUtils.damp(group.scale.x, pose.s, 1.4, delta));
      } else {
        group.position.set(tx, ty, pose.z);
        group.scale.setScalar(pose.s);
      }
    });

    // Reflections glide as the studio turns: per-section target + scroll + a slow drift.
    const main = poseFor(active.current, "main", 1, compact);
    const target = main.ry + (animate ? window.scrollY * 0.00025 + t * 0.03 : 0);
    scene.environmentRotation.y = glide ? THREE.MathUtils.damp(scene.environmentRotation.y, target, 1.2, delta) : target;
    placed.current = true; // first frame snaps into place; later frames glide
  });

  return (
    <>
      <group ref={(el) => { groups.current.main = el; }}>
        <mesh>
          <sphereGeometry args={[1, segments, segments]} />
          <meshPhysicalMaterial {...PEARL} />
        </mesh>
      </group>
      <group ref={(el) => { groups.current.accent = el; }}>
        <mesh>
          <sphereGeometry args={[1, segments / 2, segments / 2]} />
          <meshPhysicalMaterial {...RED} />
        </mesh>
      </group>
    </>
  );
}

export default function SphereScene({ quality, animate }: { quality: SceneQuality; animate: boolean }) {
  return (
    <Canvas
      dpr={SCENE_TIER_CONFIG[quality].dpr}
      frameloop={animate ? "always" : "demand"}
      camera={{ position: [0, 0, CAMERA_Z], fov: 35 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
    >
      <Studio resolution={quality === "low" ? 128 : 256} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[-5, 7, 6]} intensity={1.1} color="#fff8f2" />
      <Rig quality={quality} animate={animate} />
    </Canvas>
  );
}
