"use client";

import { useEffect } from "react";

/**
 * One site-wide listener for the shared `.glass-card` hover treatment (see
 * globals.css): writes the mouse position (`--mx`/`--my`, px) onto the glass
 * card under the cursor, which its `.card-edge` / `.card-spot` layers use to
 * glow where the mouse is. Mouse only; touch and pen leave cards in their
 * resting / active look. Renders nothing.
 */
export function GlassPointer() {
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const card = (event.target as Element | null)?.closest?.<HTMLElement>(".glass-card");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return null;
}
