"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { DeploymentScene } from "@/components/three/experiences/DeploymentScene";
import { GameFrame } from "@/components/game/GameFrame";
import { Button } from "@/components/ui/Button";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import { useWebglSupported } from "@/hooks/useWebglSupported";
import { WORKFLOW_STAGES } from "@/data/journey";

type Phase = "ready" | "running" | "complete";

interface ChecklistItem {
  label: string;
  detail: string;
}

/** Maps the real 9 `ai_workflow.sh` stages onto the brief's 4-item final
 * checklist — IMPLEMENTED / TESTED / REVIEWED / READY TO SHIP —
 * without inventing new stages. */
const CHECKLIST: ChecklistItem[] = [
  {
    label: "Implemented",
    detail: "senior-frontend-dev built the feature (implement), then generated the commit message and PR description (commit-message).",
  },
  {
    label: "Tested",
    detail: "senior-qa validated the diff (qa), and npm run build / lint / test all passed (build).",
  },
  {
    label: "Reviewed",
    detail: "report-manager compiled the report (report-manager) and senior-security-engineer reviewed the diff for OWASP risks — PASS (security).",
  },
  {
    label: "Ready to ship",
    detail: "commit, push, and pr are staged — each pausing for human y/n confirmation before gh pr create.",
  },
];

const TICK_MS = 900;

interface ReviewShipExperienceProps {
  onExit: () => void;
}

/**
 * Experience 4 of 4 — "REVIEW & SHIP". A 3D deployment/review environment:
 * the real `report-manager` and `security` stages close the loop as the
 * decorative `DeploymentScene` shows every workflow node lit and a final
 * deployment beacon igniting, ending on the brief's exact final state —
 * ✓ IMPLEMENTED ✓ TESTED ✓ REVIEWED ✓ READY TO SHIP.
 */
export function ReviewShipExperience({ onExit }: ReviewShipExperienceProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const webglSupported = useWebglSupported();
  const { isCompact } = useDeviceCapability();
  const [phase, setPhase] = useState<Phase>("ready");
  const [revealCount, setRevealCount] = useState(0);
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
    setRevealCount(CHECKLIST.length);
    setPhase("complete");
  }, [clearTimer]);

  const run = useCallback(() => {
    setRevealCount(0);
    if (prefersReducedMotion) {
      setRevealCount(CHECKLIST.length);
      setPhase("complete");
      return;
    }
    setPhase("running");
    clearTimer();
    intervalRef.current = setInterval(() => {
      setRevealCount((previous) => {
        const next = previous + 1;
        if (next >= CHECKLIST.length) {
          clearTimer();
          setPhase("complete");
          return CHECKLIST.length;
        }
        return next;
      });
    }, TICK_MS);
  }, [clearTimer, prefersReducedMotion]);

  const runAgain = useCallback(() => {
    clearTimer();
    setRevealCount(0);
    setPhase("ready");
  }, [clearTimer]);

  const showCanvas = !prefersReducedMotion && webglSupported;
  const ready = phase === "complete";

  const status =
    phase === "running"
      ? `${revealCount} of ${CHECKLIST.length} confirmed.`
      : phase === "complete"
        ? "Implemented, tested, reviewed, ready to ship."
        : "";

  return (
    <GameFrame
      eyebrow="04 · Review & ship"
      title="From reviewed diff to shippable PR"
      description="The real security review and report stages close the loop — confirm each item to see the workflow reach ready-to-ship."
      status={status}
      accentClassName="text-emerald-300"
      borderClassName="border-emerald-400/20"
      controls={
        phase === "ready" ? (
          <>
            <Button onClick={run}>Run</Button>
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
        {/* All panel heights below are fixed and deliberately small — every
            control in GameFrame's `controls` slot must stay within reach of
            GameSection's very short `min-h-[100svh]` sticky-pin budget. A
            panel tall enough that reaching a control requires scrolling
            further genuinely scrolls the page into the next chapter's
            territory before the click registers (see
            lib/motion/scrollTimeline.ts), bleeding chapter 07 through while
            this panel is still meant to be in focus — so this stays short
            rather than tall. */}
        <div className="relative h-16 w-full overflow-hidden rounded-2xl border border-emerald-400/15 bg-ink-950/60 sm:h-20">
          {showCanvas ? (
            <Canvas
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              dpr={isCompact ? [1, 1] : [1, 1.5]}
              camera={{ position: [0, 0.2, 3.4], fov: 42 }}
              gl={{ antialias: !isCompact, alpha: true }}
            >
              <color attach="background" args={["#03140f"]} />
              <DeploymentScene totalStages={WORKFLOW_STAGES.length} ready={ready} quality={isCompact ? "low" : "high"} />
            </Canvas>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#0e2f22_0%,_#03140f_75%)]" />
          )}
        </div>

        <ul className="flex flex-col gap-1">
          {CHECKLIST.map((item, index) => {
            const done = index < revealCount;
            return (
              <li
                key={item.label}
                data-state={done ? "done" : "pending"}
                className="flex flex-col gap-0.5 rounded-xl border px-3 py-1.5 text-left transition-colors duration-300 data-[state=pending]:border-white/10 data-[state=pending]:bg-white/[0.02] data-[state=done]:border-emerald-400/40 data-[state=done]:bg-emerald-500/10"
              >
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <span aria-hidden="true" className={done ? "text-emerald-400" : "text-ink-600"}>
                    {done ? "✓" : "○"}
                  </span>
                  <span className={done ? "text-emerald-200" : "text-ink-400"}>{item.label}</span>
                </span>
                {done ? <p className="pl-6 text-xs leading-snug text-ink-300">{item.detail}</p> : null}
              </li>
            );
          })}
        </ul>
      </div>
    </GameFrame>
  );
}
