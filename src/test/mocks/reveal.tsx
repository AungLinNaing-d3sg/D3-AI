/**
 * Test-only stand-in for `<Reveal>` (see jest.config.ts `moduleNameMapper`).
 *
 * The real component starts its children at `visibility: hidden` and only
 * reveals them once GSAP's ScrollTrigger fires (see
 * components/motion/Reveal.tsx) — correct in a real browser (where an
 * above-the-fold trigger fires immediately on load), but jsdom never lays
 * out or scrolls, so that trigger never fires and content would stay
 * permanently hidden from the accessibility tree in tests. This mock
 * renders children immediately/visibly so section/page tests can focus on
 * real content and semantics instead of animation timing.
 */
import type { ReactNode } from "react";

type RevealTag = "div" | "p" | "span" | "h1" | "h2" | "h3";

interface RevealProps {
  children: ReactNode;
  as?: RevealTag;
  className?: string;
  id?: string;
}

export function Reveal({ children, as = "div", className, id }: RevealProps) {
  const Tag = as;
  return (
    <Tag className={className} id={id}>
      {children}
    </Tag>
  );
}
