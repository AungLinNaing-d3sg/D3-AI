"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Logo } from "@/components/ui/Logo";
import { LinkButton } from "@/components/ui/Button";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { primaryNav } from "@/data/nav";
import { useJourneyFrame } from "@/hooks/useJourneyFrame";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import { useSiteAudio } from "@/hooks/useSiteAudio";
import { gsap } from "@/lib/motion/gsap";
import { handleInPageNavClick } from "@/lib/motion/scrollNav";

/**
 * Sticky header for the single-page scrollytelling homepage. Navigation
 * items are in-page anchors (see src/data/nav.ts) rather than routes.
 *
 * The active item is driven by the same `journeyState.activeStage` the 3D
 * scenes/chapter sections already read (see lib/motion/scrollTimeline.ts) —
 * a single glowing "pill" (glass surface + border + inner glow + an animated
 * energy line along its bottom edge) slides/resizes to sit behind whichever
 * nav link matches the current chapter (rather than each link independently
 * toggling its own static border), reading as one continuous "the system
 * knows where you are" element instead of a row of on/off states. It has no
 * matching item (and simply fades out) while the intro or game chapters are
 * active, since neither is in `primaryNav`. Hover gets its own, independent,
 * deliberately *lighter* treatment (temporary highlight vs. the active
 * pill's persistent, stronger one): a glass background/border/lift on the
 * link itself, plus a soft radial glow that follows the cursor within it,
 * `@media (hover: hover)`-gated so it never engages on touch devices.
 */
export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const desktopLinkRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const mobileLinkRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const lastActiveStage = useRef<string | null>(null);
  const { hasCoarsePointer } = useDeviceCapability();
  const { play } = useSiteAudio();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useJourneyFrame((state) => {
    if (state.activeStage === lastActiveStage.current) return;
    lastActiveStage.current = state.activeStage;

    const activeIndex = primaryNav.findIndex((item) => item.href === `#${state.activeStage}`);

    desktopLinkRefs.current.forEach((link, i) => {
      if (link) link.dataset.active = i === activeIndex ? "true" : "false";
    });
    mobileLinkRefs.current.forEach((link, i) => {
      if (link) link.dataset.active = i === activeIndex ? "true" : "false";
    });

    const indicator = indicatorRef.current;
    const nav = navRef.current;
    if (!indicator || !nav) return;

    if (activeIndex === -1) {
      indicator.dataset.visible = "false";
      return;
    }

    const link = desktopLinkRefs.current[activeIndex];
    if (!link) return;
    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    indicator.dataset.visible = "true";
    gsap.to(indicator, {
      x: linkRect.left - navRect.left,
      y: linkRect.top - navRect.top,
      width: linkRect.width,
      height: linkRect.height,
      duration: 0.5,
      ease: "power3.out",
      overwrite: true,
    });
  });

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLAnchorElement>) => {
      if (hasCoarsePointer) return;
      const target = event.currentTarget;
      const rect = target.getBoundingClientRect();
      target.style.setProperty("--nav-glow-x", `${event.clientX - rect.left}px`);
      target.style.setProperty("--nav-glow-y", `${event.clientY - rect.top}px`);
    },
    [hasCoarsePointer]
  );

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

        <nav ref={navRef} aria-label="Primary" className="relative hidden items-center gap-2 md:flex">
          <span ref={indicatorRef} data-visible="false" className="nav-active-pill" aria-hidden="true" />
          {primaryNav.map((item, index) => (
            <a
              key={item.href}
              ref={(el) => {
                desktopLinkRefs.current[index] = el;
              }}
              href={item.href}
              data-active="false"
              onPointerMove={handlePointerMove}
              onPointerEnter={() => {
                if (!hasCoarsePointer) play("hover");
              }}
              onClick={(event) => {
                play("select");
                handleInPageNavClick(event, item.href);
              }}
              className="nav-link-glow type-nav-link relative rounded-full px-3.5 py-2 text-sm text-ink-200 transition-colors duration-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 data-[active=true]:font-semibold data-[active=true]:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <SoundToggle />
          <LinkButton
            href="#cta"
            variant="primary"
            className="px-5 py-2.5 text-xs"
            onMouseEnter={() => play("hover")}
            onClick={() => play("select")}
          >
            Contact Us
          </LinkButton>
        </div>

        <button
          type="button"
          onClick={() => {
            play(isMenuOpen ? "menu-close" : "menu-open");
            setIsMenuOpen((open) => !open);
          }}
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
            {primaryNav.map((item, index) => (
              <a
                key={item.href}
                ref={(el) => {
                  mobileLinkRefs.current[index] = el;
                }}
                href={item.href}
                data-active="false"
                onClick={(event) => {
                  play("select");
                  setIsMenuOpen(false);
                  handleInPageNavClick(event, item.href);
                }}
                className="type-nav-link relative rounded-lg border border-transparent border-l-[3px] px-3 py-2.5 text-sm text-ink-200 transition-all duration-300 hover:border-white/10 hover:bg-white/5 hover:text-white data-[active=true]:border-brand-400/50 data-[active=true]:border-l-brand-400 data-[active=true]:bg-brand-500/15 data-[active=true]:font-semibold data-[active=true]:text-white data-[active=true]:shadow-[inset_0_1px_10px_rgba(253,106,80,0.18)]"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-3 flex items-center gap-2">
              <LinkButton href="#cta" variant="primary" className="flex-1" onClick={() => play("select")}>
                Contact Us
              </LinkButton>
              <SoundToggle />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
