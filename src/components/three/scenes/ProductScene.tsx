"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { BufferAttribute, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { clamp, damp, smoothstep } from "@/lib/motion/mathUtils";
import { productPanels } from "@/data/journey";

interface ProductSceneProps {
  quality: "high" | "low";
}

const PANEL_COUNT = productPanels.length;

interface DeviceProps {
  /** This device's panel index — used to read its own activity value (see
   * `activityRef`), never re-derived independently, so the hologram's glow
   * can never drift out of sync with the panel it floats above. */
  index: number;
  /** Written once per frame by the parent's panel loop below with each
   * panel's own 0..1 "how in-focus is this panel right now" value — shared
   * rather than recomputed per device so the visibility formula lives in
   * exactly one place (see CLAUDE.md "do not duplicate animation logic"). */
  activityRef: MutableRefObject<Float32Array>;
}

/**
 * "Data" pillar hologram — a small stack of layered discs (a physical stand-
 * in for a data warehouse/database), each spinning at a slightly different
 * rate, wrapped in a soft wireframe shell. Floats just above the Data glass
 * panel (src/data/services.ts index 0).
 */
function DataDevice({ index, activityRef }: DeviceProps) {
  const diskRefs = useRef<Mesh[]>([]);
  const wireRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    const activity = activityRef.current[index] ?? 0;
    diskRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.rotation.y += delta * (0.22 + i * 0.05);
      const material = mesh.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, activity * 0.9, 5, delta);
      material.emissiveIntensity = damp(material.emissiveIntensity, 0.5 + activity * 0.9, 5, delta);
    });
    if (wireRef.current) {
      wireRef.current.rotation.y -= delta * 0.1;
      const material = wireRef.current.material as MeshBasicMaterial;
      material.opacity = damp(material.opacity, activity * 0.3, 5, delta);
    }
  });

  return (
    <group position={[0, 1.5, 0]}>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={`data-disk-${i}`}
          position={[0, (i - 1.5) * 0.16, 0]}
          ref={(mesh) => {
            if (mesh) diskRefs.current[i] = mesh;
          }}
        >
          <cylinderGeometry args={[0.42 - i * 0.02, 0.42 - i * 0.02, 0.06, 32]} />
          <meshStandardMaterial
            transparent
            opacity={0}
            color="#67e8f9"
            emissive="#22d3ee"
            emissiveIntensity={0.5}
            roughness={0.25}
            metalness={0.6}
          />
        </mesh>
      ))}
      <mesh ref={wireRef}>
        <cylinderGeometry args={[0.46, 0.46, 0.68, 32, 1, true]} />
        <meshBasicMaterial transparent opacity={0} color="#67e8f9" wireframe />
      </mesh>
    </group>
  );
}

/**
 * "Dynamics" pillar hologram — an interlocking torus-knot standing in for
 * automated, looping business workflows, orbited by a thin ring. Floats
 * above the Dynamics glass panel (src/data/services.ts index 1).
 */
function DynamicsDevice({ index, activityRef }: DeviceProps) {
  const knotRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    const activity = activityRef.current[index] ?? 0;
    if (knotRef.current) {
      knotRef.current.rotation.x += delta * 0.3;
      knotRef.current.rotation.y += delta * 0.22;
      const material = knotRef.current.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, activity * 0.9, 5, delta);
      material.emissiveIntensity = damp(material.emissiveIntensity, 0.5 + activity * 0.9, 5, delta);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.16;
      const material = ringRef.current.material as MeshBasicMaterial;
      material.opacity = damp(material.opacity, activity * 0.35, 5, delta);
    }
  });

  return (
    <group position={[0, 1.5, 0]}>
      <mesh ref={knotRef} scale={0.34}>
        <torusKnotGeometry args={[0.6, 0.2, 128, 16]} />
        <meshStandardMaterial
          transparent
          opacity={0}
          color="#fd6a50"
          emissive="#f14a30"
          emissiveIntensity={0.5}
          roughness={0.25}
          metalness={0.55}
        />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.008, 12, 48]} />
        <meshBasicMaterial transparent opacity={0} color="#fd6a50" />
      </mesh>
    </group>
  );
}

/**
 * "Digital" pillar hologram — a slim device body with a glowing screen
 * plane, standing in for a modern app/product surface. Floats above the
 * Digital glass panel (src/data/services.ts index 2).
 */
function DigitalDevice({ index, activityRef }: DeviceProps) {
  const bodyRef = useRef<Mesh>(null);
  const screenRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    const activity = activityRef.current[index] ?? 0;
    if (bodyRef.current) {
      bodyRef.current.rotation.y += delta * 0.18;
      const material = bodyRef.current.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, activity * 0.9, 5, delta);
    }
    if (screenRef.current) {
      screenRef.current.rotation.y = bodyRef.current?.rotation.y ?? 0;
      const material = screenRef.current.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, activity, 5, delta);
      material.emissiveIntensity = damp(material.emissiveIntensity, 0.6 + activity * 0.8, 5, delta);
    }
  });

  return (
    <group position={[0, 1.5, 0]}>
      <mesh ref={bodyRef}>
        <boxGeometry args={[0.62, 0.42, 0.05]} />
        <meshStandardMaterial transparent opacity={0} color="#c7cfe0" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh ref={screenRef} position={[0, 0, 0.03]}>
        <planeGeometry args={[0.52, 0.32]} />
        <meshStandardMaterial
          transparent
          opacity={0}
          color="#f4f6fb"
          emissive="#22d3ee"
          emissiveIntensity={0.6}
        />
      </mesh>
    </group>
  );
}

/** Ordered to match `src/data/services.ts` / `productPanels` (Data,
 * Dynamics, Digital) — each panel's hologram is picked by index, not by
 * name, so this array's order matters. */
const DEVICE_COMPONENTS = [DataDevice, DynamicsDevice, DigitalDevice] as const;

/**
 * The unifying "AI core" the three product panels emerge from and orbit
 * around — a faceted nucleus in a soft wireframe shell, encircled by two
 * tilted, independently-rotating rings (reads as a live processing/holo-
 * graphic reactor rather than a static gem). Sits further back than the
 * panels so it reads as the platform's foundation, tilts gently toward the
 * pointer for a subtle sense of interactivity, and fades in/out with the
 * chapter's own crossfade weight like every other scene.
 */
function AiCore() {
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);
  const wireRef = useRef<Mesh>(null);
  const ringRefs = useRef<Mesh[]>([]);
  const tilt = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const weight = journeyState.weight.product;
    const group = groupRef.current;
    if (group) {
      group.visible = weight > 0.001;
      const pointer = journeyState.pointer;
      tilt.current.x = damp(tilt.current.x, pointer.y * 0.1, 3, delta);
      tilt.current.y = damp(tilt.current.y, pointer.x * 0.15, 3, delta);
      group.rotation.x = tilt.current.x;
      group.rotation.y = tilt.current.y + state.clock.elapsedTime * 0.05;
    }

    const pulse = 1 + Math.sin(state.clock.elapsedTime * 0.7) * 0.04;

    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.1;
      coreRef.current.scale.setScalar(damp(coreRef.current.scale.x, Math.max(weight * pulse, 0.001), 4, delta));
      const material = coreRef.current.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, 0.85 * weight, 4, delta);
    }

    if (wireRef.current) {
      wireRef.current.rotation.y -= delta * 0.06;
      wireRef.current.scale.setScalar(
        damp(wireRef.current.scale.x, Math.max(weight * pulse * 1.16, 0.001), 4, delta)
      );
      const material = wireRef.current.material as MeshBasicMaterial;
      material.opacity = damp(material.opacity, 0.3 * weight, 4, delta);
    }

    ringRefs.current.forEach((ring, i) => {
      if (!ring) return;
      ring.rotation.x += delta * (0.12 + i * 0.05);
      ring.rotation.z += delta * (0.08 - i * 0.03);
      const material = ring.material as MeshBasicMaterial;
      material.opacity = damp(material.opacity, 0.4 * weight, 4, delta);
    });
  });

  return (
    <group ref={groupRef} position={[0, -0.1, -2.4]}>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.62, 2]} />
        <meshStandardMaterial
          transparent
          opacity={0}
          color="#e5e9f2"
          emissive="#f14a30"
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.5}
        />
      </mesh>
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[0.62, 1]} />
        <meshBasicMaterial transparent opacity={0} color="#fd6a50" wireframe />
      </mesh>
      {[0, 1].map((i) => (
        <mesh
          key={`ai-core-ring-${i}`}
          rotation={[i === 0 ? Math.PI / 2.4 : Math.PI / 5, i * 0.6, 0]}
          ref={(mesh) => {
            if (mesh) ringRefs.current[i] = mesh;
          }}
        >
          <torusGeometry args={[0.95 + i * 0.22, 0.012, 12, 64]} />
          <meshBasicMaterial transparent opacity={0} color={i === 0 ? "#67e8f9" : "#fd6a50"} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Chapter 06 — AI Product Experience. The data universe particles thin into
 * ambient dust around a central, gently pointer-reactive "AI core" (see
 * `AiCore` above) that the three real service pillars — one per real
 * service pillar (src/data/services.ts via data/journey.ts) — orbit as both
 * a floating glass-panel dashboard (drei's `<Html transform>`, real HTML/
 * Tailwind content so it stays fully accessible) and a themed 3D hologram
 * (`DEVICE_COMPONENTS`) that rotates, brightens, and scales with exactly the
 * same scroll-driven visibility as its panel, so the object never feels like
 * generic decoration bolted on beside the story.
 */
export function ProductScene({ quality }: ProductSceneProps) {
  const groupRef = useRef<Group>(null);
  const dustHandle = useRef<ParticleSystemHandle>(null);
  const dustInitialized = useRef(false);
  const panelGroupRefs = useRef<Group[]>([]);
  const activityRef = useRef<Float32Array>(new Float32Array(PANEL_COUNT));
  const dustCount = quality === "high" ? 700 : 260;

  const devicePanels = useMemo(
    () =>
      productPanels.map((panel, index) => ({
        panel,
        Device: DEVICE_COMPONENTS[index % DEVICE_COMPONENTS.length] ?? DataDevice,
      })),
    []
  );

  useFrame((_, delta) => {
    const weight = journeyState.weight.product;
    const progress = journeyState.progress.product;
    const group = groupRef.current;
    if (group) group.visible = weight > 0.001;

    if (!dustInitialized.current) {
      const positions = dustHandle.current?.positions;
      if (positions) {
        const pointCount = positions.length / 3;
        for (let i = 0; i < pointCount; i += 1) {
          positions[i * 3] = (Math.random() - 0.5) * 9;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 5;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
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

    const panelCount = productPanels.length;
    panelGroupRefs.current.forEach((panelGroup, index) => {
      if (!panelGroup) return;
      const start = index / panelCount;
      const end = (index + 1) / panelCount;
      const center = (start + end) / 2;
      const signedDistance = clamp(progress - center, -1, 1);
      const localVisibility =
        smoothstep(0, 0.32, clamp((progress - start) / (end - start))) *
        (1 - smoothstep(0.68, 1, clamp((progress - start) / (end - start))));
      const targetScale = localVisibility * weight;

      // Shared single source of truth for this panel's hologram (see
      // `activityRef` above) — written here, once, alongside the panel's own
      // scale/position so the two visuals can never drift apart.
      activityRef.current[index] = localVisibility * weight;

      panelGroup.scale.setScalar(damp(panelGroup.scale.x, Math.max(targetScale, 0.001), 6, delta));
      panelGroup.position.z = damp(panelGroup.position.z, signedDistance * -5.5, 5, delta);
      panelGroup.position.x = damp(panelGroup.position.x, (index - (panelCount - 1) / 2) * 0.4 * (1 - localVisibility), 5, delta);
      panelGroup.rotation.y = damp(panelGroup.rotation.y, signedDistance * 1.1, 5, delta);
    });
  });

  return (
    <group ref={groupRef}>
      <ParticleSystem ref={dustHandle} count={dustCount} size={0.03} color="#f4f6fb" opacity={0} />

      <AiCore />

      {devicePanels.map(({ panel, Device }, index) => (
        <group
          key={panel.slug}
          position={[0, index % 2 === 0 ? 0.2 : -0.15, 0]}
          ref={(node) => {
            if (node) panelGroupRefs.current[index] = node;
          }}
        >
          <Device index={index} activityRef={activityRef} />

          <Html transform occlude={false} distanceFactor={5.2} className="pointer-events-none select-none">
            <div className="w-[min(22rem,86vw)] rounded-3xl border border-white/15 bg-ink-900/75 p-7 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-400">
                {panel.eyebrow}
              </p>
              <h3 className="mt-3 font-display text-xl font-semibold text-ink-50">{panel.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">{panel.summary}</p>
              <ul className="mt-4 space-y-1.5">
                {panel.bullets.slice(0, 4).map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-xs text-ink-200">
                    <span className="mt-1 h-1 w-1 flex-none rounded-full bg-brand-400" aria-hidden="true" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}
