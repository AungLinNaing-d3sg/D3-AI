"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { WorkflowPipelineScene } from "@/components/three/experiences/WorkflowPipelineScene";
import { GameFrame } from "@/components/game/GameFrame";
import { Button } from "@/components/ui/Button";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import { useWebglSupported } from "@/hooks/useWebglSupported";
import { WORKFLOW_STAGES } from "@/data/journey";
import type { WorkflowFlowLabel, WorkflowStageId } from "@/types";

type Phase = "ready" | "running" | "complete";

interface LogLine {
  stageIndex: number;
  text: string;
  final: boolean;
}

/** Real, representative terminal output per stage — grounded in the actual
 * log lines `scripts/ai_workflow.sh` prints for that stage (see the script's
 * own `log "..."` calls), condensed for a readable in-browser terminal. */
const STAGE_LOG: Record<WorkflowStageId, string[]> = {
  implement: [
    '$ scripts/ai_workflow.sh "feature-name" "feature description"',
    "[implement] Checking out latest main, creating branch ai/feature-name...",
    "[implement] Running senior-frontend-dev agent...",
    "[implement] ✓ completed",
  ],
  qa: ["[qa] Running senior-qa agent against the current diff...", "[qa] PASS – no blocking issues found", "[qa] ✓ completed"],
  build: [
    "$ npm i && npm run build",
    "[build] Build succeeded",
    "$ npm run lint",
    "[build] Lint clean",
    "$ npm run test -- --watchAll=false --passWithNoTests",
    "[build] ✓ completed",
  ],
  "commit-message": [
    "[commit-message] Generating conventional commit message + PR description...",
    "[commit-message] ✓ completed",
  ],
  commit: ["$ git commit -m \"feat: ...\"", "Continue with commit? (y/n): y", "[commit] ✓ completed"],
  push: ["$ git push -u origin ai/feature-name", "Continue with push? (y/n): y", "[push] ✓ completed"],
  pr: ["$ gh pr create --reviewer \"$REVIEWERS\"", "Continue to raise PR? (y/n): y", "[pr] ✓ completed"],
  "report-manager": ["[report-manager] Compiling report from git log/diff...", "[report-manager] ✓ completed"],
  security: [
    "[security] Running senior-security-engineer agent against the diff...",
    "[security] PASS – no blocking findings",
    "[security] ✓ completed",
  ],
};

const FLOW_LABELS: WorkflowFlowLabel[] = ["USER REQUEST", "AI AGENT", "WORKFLOW", "IMPLEMENTATION", "VALIDATION"];

const LOG_SCRIPT: LogLine[] = WORKFLOW_STAGES.flatMap((stage, stageIndex) =>
  (STAGE_LOG[stage.id] ?? []).map((text, lineIndex, all) => ({
    stageIndex,
    text,
    final: lineIndex === all.length - 1,
  }))
);

const TICK_MS = 420;
const LINES_PER_TICK = 2;

interface WorkflowRunExperienceProps {
  onAdvance: () => void;
  onExit: () => void;
}

/**
 * Experience 2 of 4 — "RUN THE AI WORKFLOW". A futuristic terminal
 * visualising the real, fixed-order stages of `scripts/ai_workflow.sh`
 * (data/journey.ts `WORKFLOW_STAGES`) — command/status lines appear
 * progressively as each stage runs, and the decorative pipeline scene
 * (`WorkflowPipelineScene`) lights up nodes and streams energy between
 * completed stages in step with the log.
 */
export function WorkflowRunExperience({ onAdvance, onExit }: WorkflowRunExperienceProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const webglSupported = useWebglSupported();
  const { isCompact } = useDeviceCapability();
  const [phase, setPhase] = useState<Phase>("ready");
  const [lineCount, setLineCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const completeInstantly = useCallback(() => {
    clearTimer();
    setLineCount(LOG_SCRIPT.length);
    setPhase("complete");
  }, [clearTimer]);

  const start = useCallback(() => {
    setLineCount(0);
    if (prefersReducedMotion) {
      setPhase("complete");
      setLineCount(LOG_SCRIPT.length);
      return;
    }
    setPhase("running");
    clearTimer();
    intervalRef.current = setInterval(() => {
      setLineCount((previous) => {
        // Two lines revealed per tick (rather than one) — halves the total
        // number of state updates/re-renders over the run without changing
        // the total reveal duration much, keeping this experience's render
        // churn in the same ballpark as the other playground experiences.
        const next = previous + LINES_PER_TICK;
        if (next >= LOG_SCRIPT.length) {
          clearTimer();
          setPhase("complete");
          return LOG_SCRIPT.length;
        }
        return next;
      });
    }, TICK_MS);
  }, [clearTimer, prefersReducedMotion]);

  const runAgain = useCallback(() => {
    clearTimer();
    setLineCount(0);
    setPhase("ready");
  }, [clearTimer]);

  const visibleLines = LOG_SCRIPT.slice(0, lineCount);
  const completedCount = useMemo(() => {
    const lastVisible = visibleLines[visibleLines.length - 1];
    if (!lastVisible) return 0;
    return lastVisible.final ? lastVisible.stageIndex + 1 : lastVisible.stageIndex;
  }, [visibleLines]);
  const runningIndex = phase === "running" ? Math.min(completedCount, WORKFLOW_STAGES.length - 1) : null;
  const currentStage = runningIndex !== null ? WORKFLOW_STAGES[runningIndex] : null;

  const activeFlowLabel: WorkflowFlowLabel =
    phase === "ready" ? "USER REQUEST" : phase === "complete" ? "VALIDATION" : currentStage?.flowLabel ?? "USER REQUEST";

  const showCanvas = !prefersReducedMotion && webglSupported;

  const status =
    phase === "running" && currentStage
      ? `Running stage ${runningIndex! + 1} of ${WORKFLOW_STAGES.length}: ${currentStage.label}.`
      : phase === "complete"
        ? `Workflow complete. All ${WORKFLOW_STAGES.length} stages finished.`
        : "";

  return (
    <GameFrame
      eyebrow="02 · Run the AI workflow"
      title="scripts/ai_workflow.sh"
      description="The real 9-stage pipeline this repo runs for every feature — start it and watch each stage execute in order."
      status={status}
      accentClassName="text-cyan-300"
      borderClassName="border-cyan-400/20"
      controls={
        phase === "ready" ? (
          <>
            <Button onClick={start}>Start Workflow</Button>
            <Button variant="ghost" onClick={onExit}>
              Back to AI Playground
            </Button>
          </>
        ) : phase === "running" ? (
          <>
            <Button variant="secondary" onClick={completeInstantly}>
              Skip
            </Button>
            <Button variant="ghost" onClick={onExit}>
              Back to AI Playground
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onAdvance}>View Result</Button>
            <Button variant="secondary" onClick={runAgain}>
              Run Again
            </Button>
            <Button variant="ghost" onClick={onExit}>
              Back to AI Playground
            </Button>
          </>
        )
      }
    >
      <div className="flex w-full max-w-2xl flex-col gap-2">
        {/* Kept deliberately compact — every one of this panel's own
            controls (Skip / View Result / Run Again / Back to AI
            Playground, GameFrame's `controls` slot below) must stay within
            reach of GameSection's very short `min-h-[100svh]` sticky-pin
            budget. A control positioned far enough below the fold that
            reaching it requires scrolling substantially further genuinely
            scrolls the page into the next chapter's territory before the
            click registers (see lib/motion/scrollTimeline.ts), bleeding
            chapter 07 through while this panel is still meant to be in
            focus — so this stays short rather than tall. */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-400">
          {FLOW_LABELS.map((label, index) => (
            <span key={label} className="flex items-center gap-2">
              <span className={label === activeFlowLabel ? "text-cyan-300" : ""}>{label}</span>
              {index < FLOW_LABELS.length - 1 ? <span aria-hidden="true">&rarr;</span> : null}
            </span>
          ))}
        </div>

        <div className="relative h-14 w-full overflow-hidden rounded-2xl border border-cyan-400/15 bg-ink-950/60 sm:h-16">
          {showCanvas ? (
            <Canvas
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              dpr={isCompact ? [1, 1] : [1, 1.5]}
              camera={{ position: [0, 0.2, 3.2], fov: 42 }}
              gl={{ antialias: !isCompact, alpha: true }}
            >
              <color attach="background" args={["#04121a"]} />
              <WorkflowPipelineScene
                totalStages={WORKFLOW_STAGES.length}
                completedCount={completedCount}
                runningIndex={runningIndex}
                accentHex="#22d3ee"
                quality={isCompact ? "low" : "high"}
              />
            </Canvas>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#0e2230_0%,_#04121a_75%)]" />
          )}
        </div>

        <ol className="flex flex-wrap justify-center gap-1.5" aria-label="Workflow stages">
          {WORKFLOW_STAGES.map((stage, index) => {
            const state = index < completedCount ? "done" : index === runningIndex ? "running" : "pending";
            return (
              <li
                key={stage.id}
                data-state={state}
                title={stage.label}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors duration-300 data-[state=pending]:border-white/10 data-[state=pending]:text-ink-500 data-[state=running]:border-cyan-400/70 data-[state=running]:bg-cyan-500/10 data-[state=running]:text-cyan-200 data-[state=done]:border-emerald-400/50 data-[state=done]:bg-emerald-500/10 data-[state=done]:text-emerald-300"
              >
                <span className="sr-only">{stage.label}</span>
                <span aria-hidden="true">{stage.index}</span>
              </li>
            );
          })}
        </ol>

        <div
          role="log"
          aria-label="Workflow terminal output"
          className="h-16 w-full overflow-y-auto rounded-2xl border border-white/10 bg-black/60 p-2.5 font-mono text-[10px] leading-snug text-emerald-300 sm:h-20"
        >
          {phase === "ready" ? (
            <p className="text-ink-500">Press &ldquo;Start Workflow&rdquo; to run scripts/ai_workflow.sh.</p>
          ) : (
            visibleLines.map((line, index) => (
              <p key={index} className={line.text.startsWith("$") ? "text-cyan-300" : line.final ? "text-emerald-300" : "text-ink-200"}>
                {line.text}
              </p>
            ))
          )}
        </div>
      </div>
    </GameFrame>
  );
}
