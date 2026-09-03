"use client";

import type { ReactNode } from "react";
import { useTilt } from "@/hooks/useTilt";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a card with a tasteful, pointer-driven 3D tilt + glare effect.
 * Keyboard/touch users get the plain, un-tilted card with the same
 * hover/focus affordances — the effect is a progressive enhancement only.
 */
export function TiltCard({ children, className = "" }: TiltCardProps) {
  const { ref, handlePointerMove, handlePointerLeave } = useTilt<HTMLDivElement>(6);

  return (
    <div className="tilt-perspective">
      <div
        ref={ref}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{
          transform:
            "rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) translateZ(0)",
        }}
        className={`relative h-full rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset] transition-transform duration-150 ease-out will-change-transform hover:border-white/20 focus-within:border-brand-400/50 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
