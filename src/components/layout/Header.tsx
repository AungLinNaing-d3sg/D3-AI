"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { LinkButton } from "@/components/ui/Button";
import { primaryNav } from "@/data/nav";

/**
 * Sticky header for the single-page scrollytelling homepage. Navigation
 * items are in-page anchors (see src/data/nav.ts) rather than routes.
 */
export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        isScrolled || isMenuOpen
          ? "border-b border-white/10 bg-ink-950/80 backdrop-blur-lg"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-10">
        <Logo />

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {primaryNav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-sm text-sm font-medium text-ink-200 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <LinkButton href="#contact" variant="primary" className="px-5 py-2.5 text-xs">
            Contact Us
          </LinkButton>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-nav"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 md:hidden"
        >
          <span className="sr-only">{isMenuOpen ? "Close menu" : "Open menu"}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      <div
        id="mobile-nav"
        className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out md:hidden ${
          isMenuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0">
          <nav aria-label="Mobile" className="flex flex-col gap-1 border-t border-white/10 px-6 py-4 sm:px-8">
            {primaryNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-200 transition-colors hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </a>
            ))}
            <LinkButton href="#contact" variant="primary" className="mt-3 w-full">
              Contact Us
            </LinkButton>
          </nav>
        </div>
      </div>
    </header>
  );
}
