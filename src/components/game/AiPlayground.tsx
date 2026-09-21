"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AgentSelectExperience } from "@/components/game/AgentSelectExperience";
import { WorkflowRunExperience } from "@/components/game/WorkflowRunExperience";
import { BuildTestExperience } from "@/components/game/BuildTestExperience";
import { ReviewShipExperience } from "@/components/game/ReviewShipExperience";
import { playgroundExperiences } from "@/data/journey";
import { resetPlaygroundAccent, setPlaygroundAccent } from "@/lib/motion/playgroundState";
import type { PlaygroundExperienceId } from "@/types";

/** The overall narrative this chapter communicates end to end, per the
 * brief: a real software request becomes a tested, reviewed, shippable
 * product by moving through the 4 experiences below. */
const OVERALL_FLOW = ["TASK", "AI AGENT", "AI WORKFLOW", "BUILD", "TEST", "REVIEW", "RESULT"] as const;

const accentTextClass: Record<PlaygroundExperienceId, string> = {
  "choose-agent": "text-brand-400",
  "run-workflow": "text-cyan-300",
  "build-test": "text-violet-300",
  "review-ship": "text-emerald-300",
};

const accentBorderClass: Record<PlaygroundExperienceId, string> = {
  "choose-agent": "border-brand-400/40 hover:border-brand-400/70",
  "run-workflow": "border-cyan-400/30 hover:border-cyan-400/70",
  "build-test": "border-violet-400/30 hover:border-violet-400/70",
  "review-ship": "border-emerald-400/30 hover:border-emerald-400/70",
};

/**
 * Chapter 06 — "AI ENGINEERING PLAYGROUND". Visualises this repo's own real
 * AI development pipeline: the 4 subagents in `.claude/agents/*.md` and the
 * 9-stage `scripts/ai_workflow.sh` (see data/journey.ts `AGENTS` /
 * `WORKFLOW_STAGES`), across 4 connected experiences —
 * Choose Your AI Agent → Run the AI Workflow → Build & Test →
 * Review & Ship — rather than unrelated mini-games. A cinematic menu
 * introduces all four as one continuous idea; picking one hands off into
 * that experience's own ready → running → complete flow (each with
 * explicit Start/Run/Skip/Back controls, so the user is never trapped), and
 * each experience can also hand off directly to the next one in sequence via
 * "Next Step"/"View Result", then back to this menu.
 *
 * Each experience owns its own small, self-contained `@react-three/fiber`
 * canvas (see components/three/experiences/*Scene.tsx) rather than the
 * shared, fixed background canvas (components/three/SceneCanvas.tsx) — the
 * shared canvas stays purely decorative/`aria-hidden` and cannot itself
 * carry click-driven interaction (see three/scenes/GameAmbienceScene.tsx),
 * so each experience gets a real, self-contained 3D scene it can safely
 * raycast/interact with, while its accessible HTML controls carry the actual
 * interaction. Switching `activeExperience` unmounts the previous
 * experience's entire component tree (including its `<Canvas>`), which tears
 * down that experience's Three.js resources, animation loops, timers, and
 * listeners automatically.
 */
export function AiPlayground() {
  const [activeExperience, setActiveExperience] = useState<PlaygroundExperienceId | null>(null);
  const [visited, setVisited] = useState<Set<PlaygroundExperienceId>>(() => new Set());

  const activeDefinition = useMemo(
    () => playgroundExperiences.find((experience) => experience.id === activeExperience) ?? null,
    [activeExperience]
  );

  useEffect(() => {
    if (activeDefinition) setPlaygroundAccent(activeDefinition.accentHex);
    else resetPlaygroundAccent();
    return () => resetPlaygroundAccent();
  }, [activeDefinition]);

  const openExperience = useCallback((id: PlaygroundExperienceId) => {
    setActiveExperience(id);
    setVisited((previous) => {
      if (previous.has(id)) return previous;
      const next = new Set(previous);
      next.add(id);
      return next;
    });
  }, []);
  const backToMenu = useCallback(() => setActiveExperience(null), []);

  const visitedCount = visited.size;

  if (activeExperience === "choose-agent") {
    return <AgentSelectExperience onAdvance={() => openExperience("run-workflow")} onExit={backToMenu} />;
  }

  if (activeExperience === "run-workflow") {
    return <WorkflowRunExperience onAdvance={() => openExperience("build-test")} onExit={backToMenu} />;
  }

  if (activeExperience === "build-test") {
    return <BuildTestExperience onAdvance={() => openExperience("review-ship")} onExit={backToMenu} />;
  }

  if (activeExperience === "review-ship") {
    return <ReviewShipExperience onExit={backToMenu} />;
  }

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <p className="max-w-xl text-balance text-center text-sm leading-relaxed text-ink-300 sm:text-base">
        This is how D3-SG turns a real software request into a tested, reviewed, shippable product — using the same
        4 AI agents and 9-stage workflow this repository runs for itself.
      </p>

      <div
        className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-500"
        aria-hidden="true"
      >
        {OVERALL_FLOW.map((label, index) => (
          <span key={label} className="flex items-center gap-2">
            <span>{label}</span>
            {index < OVERALL_FLOW.length - 1 ? <span>&rarr;</span> : null}
          </span>
        ))}
      </div>

      <ul className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        {playgroundExperiences.map((experience) => {
          const isVisited = visited.has(experience.id);
          return (
            <li key={experience.id}>
              {/* Floating, elevated tile (lift + glow on hover) rather than
                  a flat card — these are the chapter's primary actions, so
                  they get the most emphatic treatment of any card grid on
                  the site. */}
              <button
                type="button"
                onClick={() => openExperience(experience.id)}
                aria-label={`Open ${experience.title}`}
                className={`group relative flex h-full w-full flex-col items-start gap-2 overflow-hidden rounded-2xl border bg-white/[0.03] p-6 text-left shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)] transition-all duration-300 pointer-fine:hover:-translate-y-1 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${accentBorderClass[experience.id]}`}
              >
                <span
                  className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25"
                  style={{ backgroundColor: experience.accentHex }}
                  aria-hidden="true"
                />
                <div className="relative flex w-full items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-[0.24em] ${accentTextClass[experience.id]}`}>
                    {String(experience.index).padStart(2, "0")}
                  </span>
                  {isVisited ? (
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                      Visited
                    </span>
                  ) : null}
                </div>
                <p className="font-display text-lg font-semibold text-ink-50">{experience.title}</p>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{experience.tagline}</p>
                <p className="text-sm leading-relaxed text-ink-300">{experience.description}</p>
                <span
                  className={`mt-auto inline-flex items-center gap-1 pt-2 text-xs font-semibold uppercase tracking-[0.2em] ${accentTextClass[experience.id]}`}
                >
                  Open
                  <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                    &rarr;
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p aria-live="polite" className="sr-only">
        {visitedCount > 0 ? `${visitedCount} of ${playgroundExperiences.length} playground experiences visited.` : ""}
      </p>
    </div>
  );
}
