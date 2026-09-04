"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { BufferAttribute, Group } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { clamp, damp, smoothstep } from "@/lib/motion/mathUtils";
import { productPanels } from "@/data/journey";

interface ProductSceneProps {
  quality: "high" | "low";
}

/**
 * Chapter 06 — AI Product Experience. The data universe particles thin into
 * ambient dust and three floating, glass-panel product dashboards — one per
 * real service pillar (src/data/services.ts via data/journey.ts) — move
 * toward the camera, rotate into view, and hand off to the next in turn.
 * Panels are real HTML/Tailwind content positioned in 3D via drei's
 * `<Html transform>`, not flat screenshots, so they stay fully accessible.
 */
export function ProductScene({ quality }: ProductSceneProps) {
  const groupRef = useRef<Group>(null);
  const dustHandle = useRef<ParticleSystemHandle>(null);
  const dustInitialized = useRef(false);
  const panelGroupRefs = useRef<Group[]>([]);
  const dustCount = quality === "high" ? 700 : 260;

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

      panelGroup.scale.setScalar(damp(panelGroup.scale.x, Math.max(targetScale, 0.001), 6, delta));
      panelGroup.position.z = damp(panelGroup.position.z, signedDistance * -5.5, 5, delta);
      panelGroup.position.x = damp(panelGroup.position.x, (index - (panelCount - 1) / 2) * 0.4 * (1 - localVisibility), 5, delta);
      panelGroup.rotation.y = damp(panelGroup.rotation.y, signedDistance * 1.1, 5, delta);
    });
  });

  return (
    <group ref={groupRef}>
      <ParticleSystem ref={dustHandle} count={dustCount} size={0.03} color="#f4f6fb" opacity={0} />

      {productPanels.map((panel, index) => (
        <group
          key={panel.slug}
          position={[0, index % 2 === 0 ? 0.2 : -0.15, 0]}
          ref={(node) => {
            if (node) panelGroupRefs.current[index] = node;
          }}
        >
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
