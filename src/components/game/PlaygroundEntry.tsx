"use client";

import { useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { PlaygroundPreview } from "@/components/game/PlaygroundPreview";
import { playgroundCardMeta, playgroundExperiences } from "@/data/journey";
import { resetPlaygroundAccent, setPlaygroundAccent } from "@/lib/motion/playgroundState";
import type { PlaygroundExperienceId } from "@/types";

interface PlaygroundEntryProps {
  onOpen: (id: PlaygroundExperienceId) => void;
}

/**
 * Chapter 06's entry: four "system modules" rather than website cards —
 * each a small, living preview of its real experience (PlaygroundPreview)
 * with the system it represents, a one-line summary, a status and one
 * integrated action. 01 (the start of the real pipeline) is the primary
 * module; 02–04 are compact supporting modules beside it.
 *
 * - Wake-up follows real visibility: when the grid scrolls into view its
 *   `data-awake` flips on and the previews draw in, connect, then report
 *   READY (all CSS — see `.pg-grid` in globals.css). It resets once the
 *   grid is fully out of view, so coming back replays it.
 * - Hovering/focusing a module makes it the active system: its preview
 *   brightens and tilts toward the pointer, its status reads EXPLORE, the
 *   other modules quieten (never disappear), and the chapter's shared 3D
 *   ambience field shifts toward that module's accent
 *   (lib/motion/playgroundState.ts). Pointer position is written to CSS
 *   variables directly — no React state per move.
 */
export function PlaygroundEntry({ onOpen }: PlaygroundEntryProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    if (typeof IntersectionObserver === "undefined") {
      grid.dataset.awake = "true";
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.intersectionRatio >= 0.3) grid.dataset.awake = "true";
        else if (!entry.isIntersecting) delete grid.dataset.awake;
      },
      { threshold: [0, 0.3] }
    );
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => resetPlaygroundAccent(), []);

  const activate = (hex: string, target: HTMLElement) => {
    rectRef.current = target.getBoundingClientRect();
    setPlaygroundAccent(hex);
  };
  const handleMove = (event: ReactPointerEvent<HTMLElement>) => {
    const rect = rectRef.current;
    if (!rect || event.pointerType === "touch") return;
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    event.currentTarget.style.setProperty("--px", x.toFixed(3));
    event.currentTarget.style.setProperty("--py", y.toFixed(3));
  };
  const deactivate = (target: HTMLElement) => {
    target.style.setProperty("--px", "0");
    target.style.setProperty("--py", "0");
    resetPlaygroundAccent();
  };

  return (
    <div ref={gridRef} className="pg-grid" role="list" aria-label="Playground experiences">
      {playgroundExperiences.map((experience) => {
        const meta = playgroundCardMeta[experience.id];
        const primary = experience.index === 1;
        const action = primary ? "Play experience" : "Open experience";
        return (
          <article
            key={experience.id}
            role="listitem"
            className={`pg-card ${primary ? "pg-card--primary" : "pg-card--secondary"}`}
            style={{ "--accent": experience.accentHex } as CSSProperties}
            onPointerEnter={(event) => activate(experience.accentHex, event.currentTarget)}
            onPointerMove={handleMove}
            onPointerLeave={(event) => deactivate(event.currentTarget)}
            onFocus={(event) => activate(experience.accentHex, event.currentTarget)}
            onBlur={(event) => deactivate(event.currentTarget)}
          >
            <div className="pg-card-top">
              <span className="pg-index">{String(experience.index).padStart(2, "0")}</span>
              <span className="pg-system">{meta.system}</span>
              <span className="pg-status" aria-hidden="true">
                <span className="pg-status-dot" />
                <span className="pg-status-value">
                  <span className="pg-status-init">Initializing</span>
                  <span className="pg-status-ready">Ready</span>
                  <span className="pg-status-explore">Explore</span>
                </span>
              </span>
              <span aria-hidden="true" className="pg-corner-arrow">
                ↗
              </span>
            </div>

            <div className="pg-preview">
              <div className="pg-preview-stage">
                <PlaygroundPreview id={experience.id} />
              </div>
            </div>

            <div className="pg-card-body">
              <h3 className="pg-title">{experience.title}</h3>
              <p className="pg-summary">{meta.summary}</p>

              <div className="pg-card-footer">
                <button
                  type="button"
                  className="pg-action"
                  aria-label={`${action} — ${experience.title}`}
                  onClick={() => onOpen(experience.id)}
                >
                  <span>{action}</span>
                  <span aria-hidden="true" className="pg-action-arrow">
                    →
                  </span>
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
