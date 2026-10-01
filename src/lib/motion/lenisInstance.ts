import type Lenis from "lenis";

/**
 * Mutable singleton exposing the page's single Lenis instance (created in
 * `SmoothScrollProvider.tsx`) to code outside that provider — same
 * lightweight "shared ref, no context/re-renders" idiom already used for
 * `journeyState`/`disciplineFocus`. Needed so in-page navigation (the logo,
 * header nav links) can drive the *same* smooth-scroll engine the rest of
 * the page's scroll-driven animation reads from, instead of a second,
 * uncoordinated `scrollIntoView` animation racing it. `null` whenever Lenis
 * isn't running (reduced motion) — callers must fall back gracefully.
 */
export const lenisInstance: { current: Lenis | null } = { current: null };
