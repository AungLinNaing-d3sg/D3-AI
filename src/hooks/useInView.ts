"use client";

import { useEffect, useRef, useState } from "react";

interface UseInViewOptions {
  /** Fraction of the element that must be visible before it is "in view". */
  threshold?: number;
  /** Only ever trigger once (used for one-shot reveal animations). */
  once?: boolean;
  rootMargin?: string;
}

/**
 * Lightweight IntersectionObserver hook used to drive scroll-reveal
 * animations without pulling in an animation library.
 *
 * Starts as "not in view" on both server and client so there is no
 * hydration mismatch, then flips to "in view" from the observer's
 * (asynchronous) callback once the element scrolls into the viewport.
 * Every browser in Next.js's supported matrix implements
 * IntersectionObserver, so the "unsupported" branch below only guards
 * non-browser/test environments against throwing.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.2,
  once = true,
  rootMargin = "0px 0px -10% 0px",
}: UseInViewOptions = {}) {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsInView(true);
            if (once) {
              observer.unobserve(entry.target);
            }
          } else if (!once) {
            setIsInView(false);
          }
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, once, rootMargin]);

  return { ref, isInView };
}
