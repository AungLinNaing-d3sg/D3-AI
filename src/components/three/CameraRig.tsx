"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Vector3 } from "three";
import { journeyState } from "@/lib/motion/journeyState";
import { damp } from "@/lib/motion/mathUtils";

interface CameraRigProps {
  /** Disabled on touch/compact devices and when reduced motion is on. */
  enableParallax: boolean;
}

const lookTarget = new Vector3();
const desiredPosition = new Vector3();

/**
 * Damped camera follow-rig: every frame it eases the real camera towards the
 * scroll-driven target in `journeyState.camera` (the single continuous
 * flight path across all 9 chapters — see lib/motion/scrollTimeline.ts),
 * which gives the scrub a smooth, weighted, "premium" trailing feel rather
 * than snapping 1:1 to scroll position. Adds a small pointer-parallax offset
 * on devices with a fine pointer, smoothed independently of the scroll path
 * so a fast mouse flick never fights the cinematic camera move.
 */
export function CameraRig({ enableParallax }: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const parallax = useRef({ x: 0, y: 0 });

  useFrame((_, delta) => {
    const target = journeyState.camera;
    const pointer = journeyState.pointer;

    const parallaxTargetX = enableParallax ? pointer.x * 0.4 : 0;
    const parallaxTargetY = enableParallax ? pointer.y * 0.25 : 0;
    parallax.current.x = damp(parallax.current.x, parallaxTargetX, 3, delta);
    parallax.current.y = damp(parallax.current.y, parallaxTargetY, 3, delta);

    desiredPosition.set(target.x + parallax.current.x, target.y + parallax.current.y, target.z);
    camera.position.lerp(desiredPosition, 0.06);

    lookTarget.set(
      target.lookX - parallax.current.x * 0.3,
      target.lookY - parallax.current.y * 0.3,
      target.lookZ
    );
    camera.lookAt(lookTarget);

    if ("fov" in camera) {
      camera.fov = MathUtils.lerp(camera.fov, target.fov, 0.06);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
