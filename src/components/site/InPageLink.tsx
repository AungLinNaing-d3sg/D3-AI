"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { handleInPageNavClick } from "@/lib/motion/scrollNav";

interface InPageLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: `#${string}`;
  children: ReactNode;
  /** Extra work before scrolling, e.g. closing the mobile menu. */
  onNavigate?: () => void;
  "data-magnetic"?: boolean;
}

/**
 * Same-page anchor that scrolls through the shared Lenis instance (see
 * lib/motion/scrollNav.ts), so section jumps stay in sync with every
 * scroll-driven animation instead of jumping natively.
 */
export function InPageLink({ href, children, onNavigate, onClick, ...rest }: InPageLinkProps) {
  return (
    <a
      href={href}
      onClick={(event) => {
        onClick?.(event);
        onNavigate?.();
        handleInPageNavClick(event, href);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
