"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import { contactNav, SECTION_IDS, siteNav } from "@/data/home";
import { siteConfig } from "@/data/site";
import { lenisInstance } from "@/lib/motion/lenisInstance";
import { InPageLink } from "./InPageLink";

/**
 * Navigation as separate frosted-glass pills that sit together as one bar:
 * logo · section links · Contact. The pill for the section currently in view
 * turns solid. Below 1080px the links collapse into a full-screen glass menu.
 */
export function SiteHeader() {
  const [active, setActive] = useState<string>("hero");
  const [menuOpen, setMenuOpen] = useState(false);

  // The active section is the last one (in page order) whose top edge has
  // crossed 45% of the viewport. Checking edges rather than "what covers the
  // middle" matters here: the hero stays pinned behind the glass curtain, so
  // it overlaps About on screen and would otherwise steal the active state.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.45;
      let current: string = SECTION_IDS[0];
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("menu-open", menuOpen);
    root.classList.toggle("scroll-locked", menuOpen);
    if (menuOpen) lenisInstance.current?.stop();
    else lenisInstance.current?.start();
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Unlock scrolling before the in-page jump so Lenis can animate it.
  const closeMenu = () => {
    document.documentElement.classList.remove("menu-open", "scroll-locked");
    lenisInstance.current?.start();
    setMenuOpen(false);
  };

  const isActive = (href: string) => active === href.slice(1);

  return (
    <>
      <div className="nav-wrap">
        <header className="nav">
          <InPageLink className="pill pill-brand" href="#hero" aria-label={`${siteConfig.name} home`} onNavigate={closeMenu}>
            <Image src="/D3SG-logo.png" alt="D3-SG" width={180} height={56} priority />
          </InPageLink>
          <nav className="pill-group" aria-label="Primary">
            {siteNav.map((item) => (
              <InPageLink
                key={item.href}
                className={`pill${isActive(item.href) ? " is-active" : ""}`}
                href={item.href as `#${string}`}
                aria-current={isActive(item.href) ? "true" : undefined}
              >
                {item.label}
              </InPageLink>
            ))}
          </nav>
          <div className="nav-end">
            <InPageLink className="pill pill-cta" href={contactNav.href as `#${string}`}>
              {contactNav.label}
            </InPageLink>
            <button
              type="button"
              className="pill pill-icon menu-btn"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span />
              <span />
            </button>
          </div>
        </header>
      </div>

      <div id="mobile-menu" className={`mobile-menu${menuOpen ? " is-open" : ""}`} inert={!menuOpen}>
        <nav aria-label="Mobile">
          {[...siteNav, contactNav].map((item, i) => (
            <InPageLink
              key={item.href}
              className="pill"
              href={item.href as `#${string}`}
              onNavigate={closeMenu}
              style={{ "--i": i, marginBottom: "0.5rem" } as CSSProperties}
            >
              {item.label} <small>{String(i + 1).padStart(2, "0")}</small>
            </InPageLink>
          ))}
        </nav>
      </div>
    </>
  );
}
