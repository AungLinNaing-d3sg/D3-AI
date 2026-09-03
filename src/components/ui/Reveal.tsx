"use client";

import type { ElementType, ReactNode } from "react";
import { useInView } from "@/hooks/useInView";

interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Stagger delay in milliseconds, useful for lists of cards. */
  delayMs?: number;
}

/**
 * Fades + slides content up into place the first time it scrolls into
 * view. Pure CSS transition driven by IntersectionObserver — no animation
 * library required, and it degrades gracefully (content is visible by
 * default, JS only adds the entrance animation).
 */
export function Reveal({ children, as: Tag = "div", className = "", delayMs = 0 }: RevealProps) {
  const { ref, isInView } = useInView<HTMLDivElement>();

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: isInView ? `${delayMs}ms` : "0ms" }}
      className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
