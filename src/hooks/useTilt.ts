"use client";

import { useRef } from "react";

/**
 * Subtle, pointer-driven 3D tilt effect for "premium" hover cards.
 * Implemented with plain CSS custom properties + pointer events instead of
 * a 3D/animation library to keep the bundle small. Automatically does
 * nothing for touch input or users who prefer reduced motion.
 */
export function useTilt<T extends HTMLElement = HTMLDivElement>(maxDegrees = 8) {
  const ref = useRef<T | null>(null);

  const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const handlePointerMove = (event: React.PointerEvent<T>) => {
    if (event.pointerType !== "mouse" || prefersReducedMotion()) return;
    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    node.style.setProperty("--tilt-x", `${(-y * maxDegrees).toFixed(2)}deg`);
    node.style.setProperty("--tilt-y", `${(x * maxDegrees).toFixed(2)}deg`);
  };

  const handlePointerLeave = () => {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--tilt-x", "0deg");
    node.style.setProperty("--tilt-y", "0deg");
  };

  return { ref, handlePointerMove, handlePointerLeave };
}
