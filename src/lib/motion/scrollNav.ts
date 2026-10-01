import type { MouseEvent as ReactMouseEvent } from "react";
import { lenisInstance } from "./lenisInstance";

/**
 * Smooth-scrolls to an in-page section, routed through the page's own Lenis
 * instance when it's running (keeping this scroll in sync with every other
 * scroll-driven animation — `ScrollTrigger`, `journeyState`, the 3D canvas —
 * rather than fighting it with an independent `scrollIntoView` animation),
 * falling back to a native smooth scroll only when Lenis isn't active
 * (reduced motion, or before it mounts).
 */
export function scrollToSection(hash: string): void {
  if (typeof document === "undefined") return;
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  const target = document.getElementById(id);
  if (!target) return;

  const lenis = lenisInstance.current;
  if (lenis) {
    lenis.scrollTo(target, { duration: 1.2 });
  } else {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (window.history?.pushState) {
    window.history.pushState(null, "", `#${id}`);
  }
}

/**
 * Click handler for any in-page anchor (`href="#stage"`). Used by the logo
 * and header nav so every "jump to a section" click — regardless of whether
 * it's a plain `<a>` or a `next/link`-wrapped element — goes through the
 * same Lenis-aware path in `scrollToSection` rather than each relying on
 * default browser/Next.js navigation, which is what let the logo's
 * same-route `next/link` click silently no-op instead of scrolling.
 */
export function handleInPageNavClick(
  event: ReactMouseEvent<HTMLAnchorElement>,
  href: string
): void {
  if (!href.startsWith("#")) return;
  event.preventDefault();
  scrollToSection(href);
}
