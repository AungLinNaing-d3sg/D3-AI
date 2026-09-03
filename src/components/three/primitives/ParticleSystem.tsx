"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, NormalBlending, type BufferAttribute, type Points, type PointsMaterial as ThreePointsMaterial } from "three";

export interface ParticleSystemHandle {
  /** The live, mutable position buffer — write directly into it inside
   * `onFrame` (or from the parent scene's own `useFrame`) then let this
   * component flag it dirty every frame. */
  positions: Float32Array;
  material: ThreePointsMaterial | null;
  points: Points | null;
}

export interface ParticleSystemProps {
  count: number;
  size?: number;
  color?: string;
  opacity?: number;
  sizeAttenuation?: boolean;
  /** Additive blending reads as "glowing energy" (typography/neural/data
   * scenes); normal blending reads as soft atmospheric dust (cinematic
   * scenes). */
  additive?: boolean;
  /** Called once per frame with the live position buffer so the owning
   * scene can morph/animate particles without re-creating the geometry. */
  onFrame?: (positions: Float32Array, elapsedSeconds: number, deltaSeconds: number) => void;
}

/**
 * Reusable, performance-conscious `THREE.Points` renderer. This is the one
 * low-level "particles on screen" primitive shared by every particle-based
 * scene (Typography, Neural Network, Data Universe, Product ambience,
 * Cinematic Future dust) — see CLAUDE.md "create reusable 3D components" /
 * "do not duplicate animation logic". What makes each of those scenes look
 * completely different is the *position-generation logic* each one supplies
 * via `onFrame`, not this renderer.
 */
export const ParticleSystem = forwardRef<ParticleSystemHandle, ParticleSystemProps>(function ParticleSystem(
  { count, size = 0.05, color = "#c7cfe0", opacity = 0.8, sizeAttenuation = true, additive = false, onFrame },
  forwardedRef
) {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ThreePointsMaterial>(null);
  const positions = useMemo(() => new Float32Array(count * 3), [count]);

  useImperativeHandle(
    forwardedRef,
    () => ({
      positions,
      material: materialRef.current,
      points: pointsRef.current,
    }),
    [positions]
  );

  useFrame((state, delta) => {
    // Static fields (no `onFrame`) initialise their positions once via the
    // forwarded ref and never need a per-frame GPU re-upload.
    if (!onFrame) return;
    onFrame(positions, state.clock.elapsedTime, delta);
    const attribute = pointsRef.current?.geometry.attributes.position as BufferAttribute | undefined;
    if (attribute) attribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={size}
        color={color}
        transparent
        opacity={opacity}
        sizeAttenuation={sizeAttenuation}
        depthWrite={false}
        blending={additive ? AdditiveBlending : NormalBlending}
      />
    </points>
  );
});
