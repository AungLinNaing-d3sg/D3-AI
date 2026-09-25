"use client";

import Image from "next/image";
import { handleInPageNavClick } from "@/lib/motion/scrollNav";
import { useSiteAudio } from "@/hooks/useSiteAudio";

interface LogoProps {
  className?: string;
}

/**
 * Brand wordmark — uses the company's existing logo asset (public/). A real
 * `href="#intro"` anchor (not a `next/link` route push): this is a one-page
 * site, so a route-based `<Link href="/">` click on the homepage is a
 * same-URL navigation Next.js can silently no-op instead of scrolling — the
 * anchor click goes through the same Lenis-aware `scrollToSection` every
 * other in-page nav link uses (see `Header.tsx`), so it always smoothly
 * returns to the Hero from anywhere on the page, without a page reload.
 */
export function Logo({ className = "" }: LogoProps) {
  const { play } = useSiteAudio();

  return (
    <a
      href="#intro"
      onClick={(event) => {
        play("select");
        handleInPageNavClick(event, "#intro");
      }}
      className={`inline-flex items-center ${className}`.trim()}
      aria-label="D3-SG home"
    >
      <Image
        src="/D3SG-logo.png"
        alt="D3-SG"
        width={180}
        height={56}
        priority
        className="h-8 w-auto sm:h-9"
      />
    </a>
  );
}
