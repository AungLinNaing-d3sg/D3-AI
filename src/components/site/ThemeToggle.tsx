"use client";

import { useSyncExternalStore, type MouseEvent } from "react";
import { getTheme, setTheme, subscribeTheme, type Theme } from "@/lib/theme/theme";

const REVEAL_MS = 650;

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void> };
};

/**
 * Glass pill that switches light/dark. The icon morphs sun ⇄ moon, and where
 * the View Transitions API exists the new theme is revealed as a circle
 * growing from the button; otherwise (or with reduced motion) it switches
 * instantly.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  // Server snapshot is "light"; the real value (already applied by the <head>
  // script) is picked up right after hydration without a mismatch warning.
  const theme = useSyncExternalStore<Theme>(subscribeTheme, getTheme, () => "light");
  const next: Theme = theme === "dark" ? "light" : "dark";

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    const doc = document as ViewTransitionDocument;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduced) {
      setTheme(next);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = doc.startViewTransition(() => setTheme(next));
    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: REVEAL_MS, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" }
        );
      })
      .catch(() => undefined);
  }

  return (
    <button
      type="button"
      className={`pill pill-icon theme-toggle ${className}`.trim()}
      aria-label={`Switch to ${next} theme`}
      aria-pressed={theme === "dark"}
      onClick={toggle}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="theme-icon">
        <mask id="theme-moon-cut">
          <rect width="24" height="24" fill="#fff" />
          <circle className="theme-cut" cx="24" cy="4" r="7" fill="#000" />
        </mask>
        <circle className="theme-core" cx="12" cy="12" r="5" mask="url(#theme-moon-cut)" />
        <g className="theme-rays">
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1="12" y1="1.8" x2="12" y2="4" transform={`rotate(${i * 45} 12 12)`} />
          ))}
        </g>
      </svg>
    </button>
  );
}
