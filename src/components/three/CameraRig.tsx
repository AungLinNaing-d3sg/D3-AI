"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Vector3 } from "three";
import { sceneState } from "@/lib/motion/sceneState";

interface CameraRigProps {
  /** Disabled on touch/compact devices and when reduced motion is on. */
  enableParallax: boolean;
}

const lookTarget = new Vector3();
const desiredPosition = new Vector3();

/**
 * Damped camera follow-rig: every frame it lerps the real camera towards the
 * scroll-driven target in `sceneState.camera`, which gives the scrub a
 * smooth, weighted, "premium" trailing feel rather than snapping 1:1 to
 * scroll position. Adds a small pointer-parallax offset on devices with a
 * fine pointer (desktop mouse), using R3F's built-in normalized pointer
 * coordinates.
 */
export function CameraRig({ enableParallax }: CameraRigProps) {
  const { camera } = useThree();

  useFrame((state) => {
    const target = sceneState.camera;

    const parallaxX = enableParallax ? state.pointer.x * 0.4 : 0;
    const parallaxY = enableParallax ? state.pointer.y * 0.25 : 0;

    desiredPosition.set(target.x + parallaxX, target.y + parallaxY, target.z);
    camera.position.lerp(desiredPosition, 0.045);

    lookTarget.set(target.lookX - parallaxX * 0.3, target.lookY - parallaxY * 0.3, target.lookZ);
    camera.lookAt(lookTarget);

    if ("fov" in camera) {
      camera.fov = MathUtils.lerp(camera.fov, target.fov, 0.05);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
