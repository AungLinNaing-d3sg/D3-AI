"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import { siteNav } from "@/data/home";
import { siteConfig } from "@/data/site";
import { lenisInstance } from "@/lib/motion/lenisInstance";
import { InPageLink } from "./InPageLink";

/** Fixed pill header that frosts once the page scrolls, plus the full-screen
 * mobile menu (below 1080px, where the inline links are hidden by CSS). */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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

  return (
    <>
      <div className={`nav-wrap${scrolled ? " is-scrolled" : ""}`}>
        <header className="nav">
          <InPageLink className="brand" href="#hero" aria-label={`${siteConfig.name} home`} onNavigate={closeMenu}>
            <Image src="/D3SG-logo.png" alt="D3-SG" width={180} height={56} priority />
          </InPageLink>
          <nav className="nav-links" aria-label="Primary">
            {siteNav.map((item) => (
              <InPageLink key={item.href} href={item.href as `#${string}`}>
                {item.label}
              </InPageLink>
            ))}
          </nav>
          <div className="nav-actions">
            <InPageLink className="btn btn-primary btn-sm" href="#contact" data-magnetic>
              Contact us
            </InPageLink>
            <button
              type="button"
              className="menu-btn"
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
          <ul>
            {siteNav.map((item, i) => (
              <li key={item.href} style={{ "--i": i } as CSSProperties}>
                <InPageLink href={item.href as `#${string}`} onNavigate={closeMenu}>
                  {item.label} <small>{String(i + 1).padStart(2, "0")}</small>
                </InPageLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mm-foot">
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
          <a href={`tel:${siteConfig.phoneHref}`}>{siteConfig.phone}</a>
          <span>Paya Lebar Square, Singapore</span>
        </div>
      </div>
    </>
  );
}
