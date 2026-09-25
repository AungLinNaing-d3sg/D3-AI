"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AgentSelectExperience } from "@/components/game/AgentSelectExperience";
import { WorkflowRunExperience } from "@/components/game/WorkflowRunExperience";
import { BuildTestExperience } from "@/components/game/BuildTestExperience";
import { ReviewShipExperience } from "@/components/game/ReviewShipExperience";
import { PlaygroundEntry } from "@/components/game/PlaygroundEntry";
import { PlaygroundRail } from "@/components/game/PlaygroundRail";
import { playgroundExperiences } from "@/data/journey";
import { resetPlaygroundAccent, setPlaygroundAccent } from "@/lib/motion/playgroundState";
import { useSiteAudio } from "@/hooks/useSiteAudio";
import type { PlaygroundExperienceId } from "@/types";

type Chapter = "entry" | PlaygroundExperienceId;

interface AiPlaygroundProps {
  /** Lets `GameSection` shrink its own always-visible heading once the
   * visitor is inside a chapter — see the note above `PlaygroundRail` below
   * about this chapter's tight sticky-pin height budget. */
  onEntryChange?: (isEntry: boolean) => void;
}

/**
 * Chapter 06 — "AI ENGINEERING PLAYGROUND". Visualises this repo's own real
 * AI development pipeline: the 4 subagents in `.claude/agents/*.md` and the
 * 9-stage `scripts/ai_workflow.sh` (see data/journey.ts `AGENTS` /
 * `WORKFLOW_STAGES`). The entry (`PlaygroundEntry`) presents the 4
 * experiences as live "system modules" — 01 Choose Your AI Agent as the
 * primary one, 02–04 as supporting modules — each opening its experience
 * directly. From there the experiences still chain as one connected
 * pipeline (Run the AI Workflow → Build & Test → Review & Ship) via each
 * one's own "Next Step"/"View Result" control, and the persistent chapter
 * stepper (`PlaygroundRail`) shows where the visitor is in it.
 *
 * Each experience still owns its own small, self-contained `@react-three/
 * fiber` canvas (see components/three/experiences/*Scene.tsx) rather than the
 * shared, fixed background canvas (components/three/SceneCanvas.tsx) — the
 * shared canvas's own decorative "AI core" (three/scenes/GameAmbienceScene.tsx)
 * stays visually present behind the whole chapter throughout, colour-reactive
 * to whichever chapter is currently focused (lib/motion/playgroundState.ts),
 * which is what keeps a persistent core "in view" across chapter changes
 * without needing to unify the 4 experiences' independent cameras/lights into
 * one scene. Switching `activeChapter` unmounts the previous experience's
 * entire component tree (including its `<Canvas>`), which tears down that
 * experience's Three.js resources, animation loops, timers, and listeners
 * automatically.
 */
export function AiPlayground({ onEntryChange }: AiPlaygroundProps) {
  const [activeChapter, setActiveChapter] = useState<Chapter>("entry");
  const [visited, setVisited] = useState<Set<PlaygroundExperienceId>>(() => new Set());
  const { play } = useSiteAudio();

  const activeDefinition = useMemo(
    () => playgroundExperiences.find((experience) => experience.id === activeChapter) ?? null,
    [activeChapter]
  );

  useEffect(() => {
    if (activeDefinition) setPlaygroundAccent(activeDefinition.accentHex);
    else resetPlaygroundAccent();
    return () => resetPlaygroundAccent();
  }, [activeDefinition]);

  useEffect(() => {
    onEntryChange?.(activeChapter === "entry");
  }, [activeChapter, onEntryChange]);

  const openExperience = useCallback(
    (id: PlaygroundExperienceId) => {
      play("select");
      setActiveChapter(id);
      setVisited((previous) => {
        if (previous.has(id)) return previous;
        const next = new Set(previous);
        next.add(id);
        return next;
      });
    },
    [play]
  );

  const backToEntry = useCallback(() => setActiveChapter("entry"), []);

  const restartExperience = useCallback(() => {
    setActiveChapter("entry");
    setVisited(new Set());
  }, []);

  let content: ReactNode;

  if (activeChapter === "entry") {
    content = <PlaygroundEntry onOpen={openExperience} />;
  } else {
    let experience: ReactNode;
    if (activeChapter === "choose-agent") {
      experience = <AgentSelectExperience onAdvance={() => openExperience("run-workflow")} onExit={backToEntry} />;
    } else if (activeChapter === "run-workflow") {
      experience = <WorkflowRunExperience onAdvance={() => openExperience("build-test")} onExit={backToEntry} />;
    } else if (activeChapter === "build-test") {
      experience = <BuildTestExperience onAdvance={() => openExperience("review-ship")} onExit={backToEntry} />;
    } else {
      experience = <ReviewShipExperience onExit={backToEntry} onRestart={restartExperience} />;
    }

    content = (
      <div className="flex w-full flex-col items-center gap-3">
        <PlaygroundRail activeId={activeChapter} visited={visited} onSelect={openExperience} />
        {experience}
      </div>
    );
  }

  const visitedCount = visited.size;

  return (
    <div className="flex w-full flex-col items-center gap-6">
      {content}
      <p aria-live="polite" className="sr-only">
        {visitedCount > 0 ? `${visitedCount} of ${playgroundExperiences.length} playground chapters visited.` : ""}
      </p>
    </div>
  );
}
