"use client";

import { useMemo } from "react";
import { playgroundExperiences } from "@/data/journey";
import type { PlaygroundExperienceId } from "@/types";

interface PlaygroundRailProps {
  activeId: PlaygroundExperienceId;
  visited: ReadonlySet<PlaygroundExperienceId>;
  onSelect: (id: PlaygroundExperienceId) => void;
}

/**
 * Persistent chapter stepper shown above every experience chapter — replaces
 * the old "grid of 4 equal cards" landing menu with a single connected rail
 * that reads as one guided pipeline rather than a free-for-all card grid:
 * visited chapters plus the current one and the immediate next one are
 * directly clickable; later chapters render as locked/upcoming rather than
 * an equally-weighted choice, so jumping ahead out of order isn't offered
 * the way a card grid would.
 */
export function PlaygroundRail({ activeId, visited, onSelect }: PlaygroundRailProps) {
  const activeIndex = playgroundExperiences.find((experience) => experience.id === activeId)?.index ?? 1;

  const maxKnownIndex = useMemo(() => {
    const visitedIndices = playgroundExperiences
      .filter((experience) => visited.has(experience.id))
      .map((experience) => experience.index);
    return Math.max(activeIndex, ...visitedIndices, 0);
  }, [activeIndex, visited]);

  return (
    <ol
      aria-label="Playground chapters"
      className="flex w-full max-w-3xl items-stretch gap-1.5 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] p-1 backdrop-blur-sm sm:gap-2"
    >
      {playgroundExperiences.map((experience) => {
        const isCurrent = experience.id === activeId;
        const isDone = !isCurrent && visited.has(experience.id);
        const isUnlocked = isCurrent || isDone || experience.index <= maxKnownIndex + 1;
        const state = isCurrent ? "current" : isDone ? "done" : isUnlocked ? "next" : "locked";

        const label = isCurrent
          ? `${experience.title} — current chapter`
          : isDone
            ? `${experience.title} — completed, select to revisit`
            : isUnlocked
              ? `${experience.title} — next chapter`
              : `${experience.title} — locked, complete earlier chapters first`;

        return (
          <li key={experience.id} className="min-w-[6.5rem] flex-1">
            <button
              type="button"
              disabled={!isUnlocked}
              onClick={() => onSelect(experience.id)}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={label}
              data-state={state}
              className="group flex w-full flex-col items-start gap-0.5 rounded-xl border px-2.5 py-1 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed data-[state=locked]:border-transparent data-[state=locked]:opacity-40 data-[state=current]:border-white/40 data-[state=current]:bg-white/10 data-[state=done]:border-emerald-400/30 data-[state=done]:bg-emerald-500/[0.06] data-[state=next]:border-white/15 data-[state=next]:bg-white/[0.03] pointer-fine:data-[state=next]:hover:border-white/30"
            >
              <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-400">
                <span style={{ color: isCurrent || isDone ? experience.accentHex : undefined }}>
                  {String(experience.index).padStart(2, "0")}
                </span>
                {isDone ? (
                  <span aria-hidden="true" className="text-emerald-400">
                    &#10003;
                  </span>
                ) : null}
              </span>
              <span className="text-[11px] font-semibold leading-tight text-ink-100 sm:text-xs">{experience.title}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
