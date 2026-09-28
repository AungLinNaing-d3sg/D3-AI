"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { Logo } from "@/components/ui/Logo";
import { LinkButton } from "@/components/ui/Button";
import { primaryNav } from "@/data/nav";
import { useJourneyFrame } from "@/hooks/useJourneyFrame";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { gsap } from "@/lib/motion/gsap";
import { handleInPageNavClick } from "@/lib/motion/scrollNav";

/** Pointer tilt limits (degrees) — felt more than seen. */
const TILT_X = 1.5;
const TILT_Y = 2;

/**
 * Sticky header for the single-page scrollytelling homepage. Navigation
 * items are in-page anchors (see src/data/nav.ts) rather than routes.
 *
 * A floating bar of dark glass — its own layer of backdrop blur, a top-edge
 * reflection, a hairline border and a soft shadow — that sits a little
 * above the page: more transparent over the Hero, more defined once
 * scrolled. With a fine pointer the bar tilts a degree or two towards the
 * cursor, a faint light follows the pointer inside it, and its contents
 * shift slightly further than the glass, so it reads as an object with
 * depth. All of that is CSS variables written from pointer events (rAF-
 * batched, rect cached on enter) — no per-frame React state.
 *
 * Links lift towards the viewer on hover, with a light sweep across them
 * and an underline drawing in. The active chapter — driven by the same
 * `journeyState.activeStage` the 3D scenes read (lib/motion/
 * scrollTimeline.ts) — gets brighter, raised text and one shared indicator
 * (a thin light beam with a small luminous point) that travels from the
 * previous item to the new one, animating position and width, while a
 * light passes across the arriving item. The indicator fades out while the
 * intro or game chapters are active, since neither is in `primaryNav`.
 *
 * Under reduced motion the tilt, parallax, sweeps and travel are off and
 * the active item is tracked by an IntersectionObserver instead (the
 * scroll timeline doesn't run then); the indicator simply fades in place.
 *
 * Phones/tablets: the menu opens as a glass panel that emerges from the
 * bar in perspective, its links staggering in; Escape or a press outside
 * closes it, and it's inert (not focusable) while closed.
 */
export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const desktopLinkRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const mobileLinkRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const lastActiveStage = useRef<string | null>(null);
  const barRect = useRef<DOMRect | null>(null);
  const pointerFrame = useRef(0);
  const { hasCoarsePointer } = useDeviceCapability();
  const prefersReducedMotion = usePrefersReducedMotion();
  const interactive = !hasCoarsePointer && !prefersReducedMotion;

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /** Marks the active link (desktop + mobile) and moves the shared indicator. */
  const setActive = useCallback(
    (stage: string, instant: boolean) => {
      if (stage === lastActiveStage.current) return;
      const previousIndex = primaryNav.findIndex((item) => item.href === `#${lastActiveStage.current}`);
      lastActiveStage.current = stage;
      const activeIndex = primaryNav.findIndex((item) => item.href === `#${stage}`);

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

      // A light passes across the arriving item (restarted each arrival).
      if (!instant && previousIndex !== activeIndex) {
        link.dataset.arriving = "false";
        void link.offsetWidth;
        link.dataset.arriving = "true";
      }

      const wasVisible = indicator.dataset.visible === "true";
      indicator.dataset.visible = "true";
      // Offsets within the nav (layout values — unaffected by the bar's tilt).
      const x = link.offsetLeft + link.offsetWidth * 0.2;
      const width = link.offsetWidth * 0.6;
      gsap.to(indicator, {
        x,
        width,
        // First appearance fades in place; later changes travel.
        duration: instant || !wasVisible ? 0 : 0.7,
        ease: "expo.out",
        overwrite: true,
      });
    },
    []
  );

  useJourneyFrame((state) => setActive(state.activeStage, false));

  // Reduced motion: the scroll timeline (and so `journeyState`) is off —
  // track the section crossing the middle of the viewport instead.
  useEffect(() => {
    if (!prefersReducedMotion || typeof IntersectionObserver === "undefined") return;
    const sections = primaryNav
      .map((item) => document.getElementById(item.href.slice(1)))
      .filter((el): el is HTMLElement => Boolean(el));
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((entry) => entry.isIntersecting);
        if (hit) setActive(hit.target.id, true);
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [prefersReducedMotion, setActive]);

  // Keep the indicator under its link when the layout changes width.
  useEffect(() => {
    const onResize = () => {
      barRect.current = null;
      const stage = lastActiveStage.current;
      if (!stage) return;
      lastActiveStage.current = null;
      setActive(stage, true);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setActive]);

  /* Pointer depth: tilt, inner light, parallax — CSS variables only. */
  const writePointer = useCallback((nx: number, ny: number, x: number, y: number) => {
    const bar = barRef.current;
    if (!bar) return;
    bar.style.setProperty("--nav-rx", `${(-ny * TILT_X).toFixed(2)}deg`);
    bar.style.setProperty("--nav-ry", `${(nx * TILT_Y).toFixed(2)}deg`);
    bar.style.setProperty("--nav-nx", nx.toFixed(3));
    bar.style.setProperty("--nav-ny", ny.toFixed(3));
    bar.style.setProperty("--nav-lx", `${x.toFixed(0)}px`);
    bar.style.setProperty("--nav-ly", `${y.toFixed(0)}px`);
  }, []);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const rect = (barRect.current ??= event.currentTarget.getBoundingClientRect());
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      cancelAnimationFrame(pointerFrame.current);
      pointerFrame.current = requestAnimationFrame(() =>
        writePointer((x / rect.width) * 2 - 1, (y / rect.height) * 2 - 1, x, y)
      );
    },
    [interactive, writePointer]
  );

  const handlePointerEnter = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      barRect.current = event.currentTarget.getBoundingClientRect();
      event.currentTarget.dataset.pointer = "true";
    },
    [interactive]
  );

  const handlePointerLeave = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      cancelAnimationFrame(pointerFrame.current);
      barRect.current = null;
      event.currentTarget.dataset.pointer = "false";
      writePointer(0, 0, event.currentTarget.offsetWidth / 2, event.currentTarget.offsetHeight / 2);
    },
    [writePointer]
  );

  useEffect(() => () => cancelAnimationFrame(pointerFrame.current), []);

  // Mobile menu: Escape or a press outside closes it.
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsMenuOpen(false);
      toggleRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [isMenuOpen]);

  return (
    <header
      ref={headerRef}
      className="site-nav fixed inset-x-0 top-0 z-50"
      data-scrolled={isScrolled || isMenuOpen}
      data-menu-open={isMenuOpen}
    >
      <div className="site-nav-frame mx-auto w-full max-w-7xl px-3 pt-3 sm:px-5 lg:px-6">
        <div
          ref={barRef}
          className="site-nav-bar"
          data-pointer="false"
          onPointerEnter={handlePointerEnter}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <span className="site-nav-glass" aria-hidden="true" />
          <span className="site-nav-light" aria-hidden="true" />

          <div className="site-nav-content">
            <Logo className="site-nav-logo" />

            <nav ref={navRef} aria-label="Primary" className="site-nav-links hidden lg:flex">
              <span ref={indicatorRef} data-visible="false" className="site-nav-indicator" aria-hidden="true">
                <span className="site-nav-indicator-dot" />
              </span>
              {primaryNav.map((item, index) => (
                <a
                  key={item.href}
                  ref={(el) => {
                    desktopLinkRefs.current[index] = el;
                  }}
                  href={item.href}
                  data-active="false"
                  data-cursor="magnetic"
                  onClick={(event) => handleInPageNavClick(event, item.href)}
                  className="site-nav-link type-nav-link"
                >
                  <span className="site-nav-link-label">{item.label}</span>
                </a>
              ))}
            </nav>

            <div className="site-nav-actions">
              <div className="hidden lg:flex">
                <LinkButton href="#cta" variant="primary" className="site-nav-cta px-5 py-2.5 text-xs">
                  Contact Us
                </LinkButton>
              </div>

              <button
                ref={toggleRef}
                type="button"
                onClick={() => setIsMenuOpen((open) => !open)}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-nav"
                className="site-nav-toggle"
              >
                <span className="sr-only">{isMenuOpen ? "Close menu" : "Open menu"}</span>
                <span className="site-nav-toggle-icon" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </button>
            </div>
          </div>
        </div>

        <div id="mobile-nav" className="site-nav-panel lg:hidden" data-open={isMenuOpen} inert={!isMenuOpen}>
          <span className="site-nav-glass" aria-hidden="true" />
          <nav aria-label="Mobile" className="site-nav-panel-links">
            {primaryNav.map((item, index) => (
              <a
                key={item.href}
                ref={(el) => {
                  mobileLinkRefs.current[index] = el;
                }}
                href={item.href}
                data-active="false"
                onClick={(event) => {
                  setIsMenuOpen(false);
                  handleInPageNavClick(event, item.href);
                }}
                className="site-nav-panel-link type-nav-link"
                style={{ "--i": index } as CSSProperties}
              >
                <span className="site-nav-panel-dot" aria-hidden="true" />
                {item.label}
              </a>
            ))}
            <div className="site-nav-panel-cta" style={{ "--i": primaryNav.length } as CSSProperties}>
              <LinkButton href="#cta" variant="primary" className="w-full" onClick={() => setIsMenuOpen(false)}>
                Contact Us
              </LinkButton>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
