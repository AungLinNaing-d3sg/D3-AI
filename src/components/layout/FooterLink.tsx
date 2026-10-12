"use client";

import type { ReactNode } from "react";
import { handleInPageNavClick } from "@/lib/motion/scrollNav";

interface FooterLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

/** In-page footer link that scrolls through the shared Lenis instance. */
export function FooterLink({ href, children, className = "v2-pill" }: FooterLinkProps) {
  return (
    <a href={href} className={className} onClick={(event) => handleInPageNavClick(event, href)}>
      {children}
    </a>
  );
}
