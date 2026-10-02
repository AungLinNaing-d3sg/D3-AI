"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import { useWebglSupported } from "@/hooks/useWebglSupported";

// three.js stays out of the initial bundle and never runs on the server.
const SphereScene = dynamic(() => import("@/components/three/background/SphereScene"), { ssr: false });

/**
 * Mounts the 3D sphere backdrop once the browser is idle, so it never
 * competes with first paint. Skipped where WebGL is unavailable; rendered as
 * a still frame (no motion) when the visitor prefers reduced motion.
 */
export function Background3D() {
  const webgl = useWebglSupported();
  const { prefersReducedMotion, quality } = useDeviceCapability();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setReady(true), 800);
    return () => window.clearTimeout(id);
  }, []);

  if (!webgl || !ready) return null;
  return (
    <div className="bg-3d">
      <SphereScene quality={quality} animate={!prefersReducedMotion} />
    </div>
  );
}
