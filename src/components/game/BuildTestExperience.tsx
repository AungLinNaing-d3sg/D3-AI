"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { DevCoreScene } from "@/components/three/experiences/DevCoreScene";
import { GameFrame } from "@/components/game/GameFrame";
import { Button } from "@/components/ui/Button";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import { useWebglSupported } from "@/hooks/useWebglSupported";
import { usePlaygroundFailureSignal, usePlaygroundRunSignal } from "@/hooks/usePlaygroundSignals";
import type { BuildTestStatus } from "@/components/game/BuildTestExperience.types";

type Phase = "ready" | "running" | "complete";
type BeatKind = "assistant" | "file" | "code" | "terminal";

interface Beat {
  status: BuildTestStatus;
  kind: BeatKind;
  text: string;
}

/** A fixed, deterministic dramatisation of the real build-stage commands
 * (`npm run build`, `npm run lint`,
 * `npm run test -- --watchAll=false --passWithNoTests`) and the brief's
 * status sequence — ANALYZING → IMPLEMENTING → TESTING →
 * FIXING → VERIFIED — including one detected-and-fixed issue, so the
 * flow reads like a real dev workstation rather than a generic loader. */
const BEATS: Beat[] = [
  { status: "analyzing", kind: "assistant", text: "Analyzing task: add a reusable FeatureCard component." },
  { status: "analyzing", kind: "file", text: "src/components/FeatureCard.tsx (new)" },
  { status: "implementing", kind: "assistant", text: "Implementing FeatureCard.tsx..." },
  { status: "implementing", kind: "code", text: "export function FeatureCard({ title, description }: FeatureCardProps) {" },
  { status: "implementing", kind: "code", text: "  return (" },
  { status: "implementing", kind: "code", text: '    <div className="rounded-xl border p-4">' },
  { status: "implementing", kind: "code", text: "      <h3>{title}</h3>" },
  { status: "implementing", kind: "code", text: "      <p>{description}</p>" },
  { status: "implementing", kind: "code", text: "    </div>" },
  { status: "implementing", kind: "code", text: "  );" },
  { status: "implementing", kind: "code", text: "}" },
  { status: "testing", kind: "terminal", text: "$ npm run build" },
  { status: "testing", kind: "terminal", text: "Build succeeded" },
  { status: "testing", kind: "terminal", text: "$ npm run lint" },
  { status: "testing", kind: "terminal", text: "0 problems" },
  { status: "testing", kind: "terminal", text: "$ npm run test -- --watchAll=false --passWithNoTests" },
  { status: "testing", kind: "terminal", text: "FAIL FeatureCard.test.tsx – heading role missing" },
  { status: "fixing", kind: "assistant", text: "Detected 1 failing test – applying fix..." },
  { status: "fixing", kind: "code", text: '      <h3 role="heading" aria-level={3}>{title}</h3>  // fixed' },
  { status: "fixing", kind: "terminal", text: "$ npm run test -- --watchAll=false --passWithNoTests" },
  { status: "verified", kind: "terminal", text: "PASS FeatureCard.test.tsx (3/3)" },
  { status: "verified", kind: "assistant", text: "All checks green – build, lint, and tests verified." },
];

const TICK_MS = 380;

const STATUS_LABEL: Record<BuildTestStatus, string> = {
  idle: "Idle",
  analyzing: "Analyzing",
  implementing: "Implementing",
  testing: "Testing",
  fixing: "Fixing",
  verified: "Verified",
};

interface BuildTestExperienceProps {
  onAdvance: () => void;
  onExit: () => void;
}

/**
 * Experience 3 of 4 — "BUILD & TEST". A realistic developer workstation (AI
 * assistant panel, code editor, file changes, terminal) dramatising the
 * real build-stage commands and the brief's ANALYZING → IMPLEMENTING →
 * TESTING → FIXING → VERIFIED status sequence, including one
 * detected-and-fixed issue. The decorative `DevCoreScene` canvas reacts to
 * the same status the accessible panel shows.
 */
export function BuildTestExperience({ onAdvance, onExit }: BuildTestExperienceProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const webglSupported = useWebglSupported();
  const { isCompact } = useDeviceCapability();
  const [phase, setPhase] = useState<Phase>("ready");
  usePlaygroundRunSignal(phase);
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
    setRevealCount(BEATS.length);
    setPhase("complete");
  }, [clearTimer]);

  const run = useCallback(() => {
    setRevealCount(0);
    if (prefersReducedMotion) {
      setRevealCount(BEATS.length);
      setPhase("complete");
      return;
    }
    setPhase("running");
    clearTimer();
    intervalRef.current = setInterval(() => {
      setRevealCount((previous) => {
        const next = previous + 1;
        if (next >= BEATS.length) {
          clearTimer();
          setPhase("complete");
          return BEATS.length;
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

  const revealed = BEATS.slice(0, revealCount);
  const status: BuildTestStatus = revealed[revealed.length - 1]?.status ?? "idle";
  usePlaygroundFailureSignal(status === "fixing");
  const assistantLines = useMemo(() => revealed.filter((beat) => beat.kind === "assistant"), [revealed]);
  const fileLines = useMemo(() => revealed.filter((beat) => beat.kind === "file"), [revealed]);
  const codeLines = useMemo(() => revealed.filter((beat) => beat.kind === "code"), [revealed]);
  const terminalLines = useMemo(() => revealed.filter((beat) => beat.kind === "terminal"), [revealed]);

  const showCanvas = !prefersReducedMotion && webglSupported;

  const statusSequence: BuildTestStatus[] = ["analyzing", "implementing", "testing", "fixing", "verified"];

  const statusText =
    phase === "ready" ? "" : phase === "complete" ? "Build and test cycle verified." : `Status: ${STATUS_LABEL[status]}.`;

  return (
    <GameFrame
      eyebrow="03 · Build & test"
      title="Inside a real dev workstation"
      description="The same analyze, implement, test, fix, and verify loop the build stage runs for real — npm run build, lint, and test."
      status={statusText}
      accentClassName="text-violet-300"
      borderClassName="border-violet-400/20"
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
            <Button onClick={onAdvance}>Next Step</Button>
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
      <div className="flex w-full max-w-3xl flex-col gap-2">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {statusSequence.map((step) => {
            const state = status === step ? "current" : statusSequence.indexOf(status) > statusSequence.indexOf(step) || phase === "complete" ? "done" : "pending";
            return (
              <span
                key={step}
                data-state={state}
                className="rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors duration-300 data-[state=pending]:border-white/10 data-[state=pending]:text-ink-500 data-[state=current]:border-violet-400/70 data-[state=current]:bg-violet-500/10 data-[state=current]:text-violet-200 data-[state=done]:border-emerald-400/50 data-[state=done]:bg-emerald-500/10 data-[state=done]:text-emerald-300"
              >
                {STATUS_LABEL[step]}
              </span>
            );
          })}
        </div>

        {/* All panel heights below are fixed and deliberately small — every
            control in GameFrame's `controls` slot must stay within reach of
            GameSection's very short `min-h-[100svh]` sticky-pin budget. A
            panel tall enough that reaching a control requires scrolling
            further genuinely scrolls the page into the next chapter's
            territory before the click registers (see
            lib/motion/scrollTimeline.ts), bleeding chapter 07 through while
            this panel is still meant to be in focus — so this stays short,
            with internal `overflow-y-auto` scroll for the log-like panels,
            rather than tall. */}
        <div className="relative h-14 w-full overflow-hidden rounded-2xl border border-violet-400/15 bg-ink-950/60 sm:h-16">
          {showCanvas ? (
            <Canvas
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              dpr={isCompact ? [1, 1] : [1, 1.5]}
              camera={{ position: [0, 0, 2.6], fov: 40 }}
              gl={{ antialias: !isCompact, alpha: true }}
            >
              <color attach="background" args={["#0c0818"]} />
              <DevCoreScene status={status} quality={isCompact ? "low" : "high"} />
            </Canvas>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#1a1030_0%,_#0c0818_75%)]" />
          )}
        </div>

        <div className="grid w-full gap-2 sm:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">AI assistant</p>
            <div className="flex h-8 flex-col gap-0.5 overflow-y-auto text-xs leading-snug text-ink-200">
              {assistantLines.length ? (
                assistantLines.slice(-2).map((line, index) => <p key={index}>{line.text}</p>)
              ) : (
                <p className="text-ink-500">Press &ldquo;Run&rdquo; to begin.</p>
              )}
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">File changes</p>
            <ul className="flex h-4 flex-col gap-0.5 overflow-y-auto text-[10px] font-mono text-emerald-300">
              {fileLines.slice(-2).map((line, index) => (
                <li key={index}>+ {line.text}</li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-black/60 p-3 font-mono text-[10px] leading-snug text-ink-100">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">Code editor</p>
            <div className="h-14 overflow-y-auto">
              {codeLines.length ? (
                codeLines.map((line, index) => <p key={index}>{line.text}</p>)
              ) : (
                <p className="text-ink-600">{"// waiting for implementation"}</p>
              )}
            </div>
          </div>
        </div>

        <div role="log" aria-label="Test terminal output" className="h-14 w-full overflow-y-auto rounded-2xl border border-white/10 bg-black/60 p-2 font-mono text-[10px] leading-snug text-emerald-300 sm:h-16">
          {terminalLines.length ? (
            terminalLines.map((line, index) => (
              <p key={index} className={line.text.startsWith("$") ? "text-cyan-300" : line.text.startsWith("FAIL") ? "text-rose-300" : line.text.startsWith("PASS") ? "text-emerald-300" : "text-ink-200"}>
                {line.text}
              </p>
            ))
          ) : (
            <p className="text-ink-500">$ waiting for test run</p>
          )}
        </div>
      </div>
    </GameFrame>
  );
}
