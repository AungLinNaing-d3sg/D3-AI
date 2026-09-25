"use client";

import type { MouseEvent } from "react";
import { handleInPageNavClick } from "@/lib/motion/scrollNav";

interface CtaStartLinkProps {
  /** In-page target, e.g. `#cta-contact`. */
  href: `#${string}`;
  /** The field to hand focus to once the visitor asks to start. */
  focusId: string;
}

/**
 * Chapter 08's primary action: glides to the message form through the
 * page's own Lenis-aware scroll (lib/motion/scrollNav.ts) — the same path as
 * the header nav — and hands keyboard focus to its first field as soon as
 * it can take it (without a second, native scroll jump), so starting a
 * conversation is one click or one keypress. A real link: it still works
 * without JS.
 */
export function CtaStartLink({ href, focusId }: CtaStartLinkProps) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    handleInPageNavClick(event, href);
    // The form fades in with its own scroll reveal, and a field can't take
    // focus while that is still hidden — so keep offering focus each frame
    // until it lands (or ~2s pass), without a second, native scroll jump.
    let frames = 0;
    const offerFocus = () => {
      const field = document.getElementById(focusId);
      field?.focus({ preventScroll: true });
      if (field && document.activeElement !== field && frames++ < 120) requestAnimationFrame(offerFocus);
    };
    offerFocus();
  }

  return (
    <a href={href} onClick={onClick} className="cta-pill cta-pill--primary">
      <span>Start a conversation</span>
      <svg
        aria-hidden="true"
        className="cta-pill-arrow"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 8h9.5M8.5 4l4 4-4 4" />
      </svg>
    </a>
  );
}
