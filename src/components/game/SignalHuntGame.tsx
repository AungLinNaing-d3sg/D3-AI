"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { SignalHuntScene } from "@/components/three/games/SignalHuntScene";
import { GameFrame } from "@/components/game/GameFrame";
import { Button } from "@/components/ui/Button";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { clamp } from "@/lib/motion/mathUtils";
import type { NodeStatus, SignalNode } from "@/components/game/SignalHuntGame.types";

/** Fixed, deterministic layout (no `Math.random()` at module scope) so
 * server/client markup never mismatches and every player gets the same fair
 * field. Signal call-signs are prefixed "AI-", noise/error transmissions
 * "ERR-"/"NSE-" — the real, sighted-and-screen-reader-equivalent cue is the
 * label text, not colour alone (WCAG 1.4.1). */
const SIGNAL_NODES: SignalNode[] = [
  { id: "s1", kind: "signal", label: "AI-04", xPercent: 16, yPercent: 26, depth: -0.5 },
  { id: "n1", kind: "noise", label: "ERR-12", xPercent: 38, yPercent: 16, depth: 0.3 },
  { id: "s2", kind: "signal", label: "AI-11", xPercent: 62, yPercent: 20, depth: -0.2 },
  { id: "n2", kind: "noise", label: "NSE-07", xPercent: 84, yPercent: 30, depth: 0.5 },
  { id: "s3", kind: "signal", label: "AI-19", xPercent: 24, yPercent: 54, depth: 0.15 },
  { id: "n3", kind: "noise", label: "ERR-03", xPercent: 50, yPercent: 62, depth: -0.35 },
  { id: "s4", kind: "signal", label: "AI-27", xPercent: 76, yPercent: 56, depth: 0.35 },
  { id: "s5", kind: "signal", label: "AI-33", xPercent: 14, yPercent: 84, depth: -0.1 },
  { id: "n4", kind: "noise", label: "NSE-15", xPercent: 46, yPercent: 88, depth: 0.25 },
  { id: "s6", kind: "signal", label: "AI-40", xPercent: 86, yPercent: 82, depth: -0.2 },
];

const SIGNAL_COUNT = SIGNAL_NODES.filter((node) => node.kind === "signal").length;
const GAME_DURATION_SECONDS = 25;
const CORRECT_SCORE = 16;
const INCORRECT_SCORE = 12;

type Phase = "ready" | "playing" | "result";
type StatusMap = Record<string, NodeStatus>;

function idleStatuses(): StatusMap {
  return Object.fromEntries(SIGNAL_NODES.map((node) => [node.id, "idle" as NodeStatus]));
}

interface SignalHuntGameProps {
  onFinish: (accuracy: number) => void;
  onExit: () => void;
}

/**
 * Mini-game 2 of 4 — "AI SIGNAL HUNT". A field of glowing transmissions
 * orbits a central AI core; the player must tag every genuine signal
 * (octahedra, "AI-xx" call-signs) before the timer runs out while leaving
 * noise/error transmissions (tetrahedra, "ERR-xx"/"NSE-xx") alone. The 3D
 * scene (`SignalHuntScene`, components/three/games/SignalHuntScene.tsx) is
 * purely decorative/`aria-hidden`; the real, keyboard-operable interaction is
 * the button grid layered on top — same "3D decorates, HTML carries the
 * interaction" split used across the main journey (see AboutScene/ProductScene).
 */
export function SignalHuntGame({ onFinish, onExit }: SignalHuntGameProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>("ready");
  const [statuses, setStatuses] = useState<StatusMap>(idleStatuses);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SECONDS);

  const lockedCount = useMemo(() => Object.values(statuses).filter((status) => status === "correct").length, [statuses]);

  const start = useCallback(() => {
    setStatuses(idleStatuses());
    setScore(0);
    setTimeLeft(GAME_DURATION_SECONDS);
    setPhase("playing");
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const interval = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(interval);
          setPhase("result");
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase === "result") onFinish(score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const resolveNode = useCallback(
    (node: SignalNode) => {
      if (phase !== "playing" || statuses[node.id] !== "idle") return;
      const outcome: NodeStatus = node.kind === "signal" ? "correct" : "incorrect";
      const next = { ...statuses, [node.id]: outcome };
      setStatuses(next);
      setScore((currentScore) => clamp(currentScore + (outcome === "correct" ? CORRECT_SCORE : -INCORRECT_SCORE), 0, 100));

      // The hunt is won once every real signal is locked — noise/error nodes
      // are meant to be *avoided*, not necessarily clicked, so completion is
      // keyed off signals found, not total nodes resolved (any remaining
      // noise nodes simply stay untouched, exactly as intended).
      const lockedTotal = Object.values(next).filter((value) => value === "correct").length;
      if (lockedTotal >= SIGNAL_COUNT) setPhase("result");
    },
    [phase, statuses]
  );

  const tier =
    score >= 80
      ? { label: "Signal locked", tone: "text-emerald-400" }
      : score >= 50
        ? { label: "Signal acquired", tone: "text-cyan-300" }
        : { label: "Lost in the noise", tone: "text-ink-300" };

  const status =
    phase === "playing"
      ? `${lockedCount} of ${SIGNAL_COUNT} signals locked. ${timeLeft} seconds remaining.`
      : phase === "result"
        ? `Hunt complete. ${score} percent signal accuracy, rated ${tier.label}.`
        : "";

  return (
    <GameFrame
      eyebrow="Mini-game 2 · AI Signal Hunt"
      title="Find the true signal"
      description="Tag every genuine AI signal (AI-xx) racing toward the core. Leave noise and error transmissions (ERR-xx / NSE-xx) untouched."
      status={status}
      accentClassName="text-cyan-300"
      borderClassName="border-cyan-400/20"
      controls={
        phase === "ready" ? (
          <>
            <Button onClick={start}>Play</Button>
            <Button variant="secondary" onClick={onExit}>
              Skip
            </Button>
          </>
        ) : phase === "playing" ? (
          <Button variant="ghost" onClick={onExit}>
            Skip
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={start}>
              Replay
            </Button>
            <Button variant="ghost" onClick={onExit}>
              Back to playground
            </Button>
          </>
        )
      }
    >
      <div className="flex w-full max-w-xl flex-col gap-3">
        {phase === "playing" ? (
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-ink-300">
            <span>Locked {lockedCount}/{SIGNAL_COUNT}</span>
            <span>{timeLeft}s</span>
          </div>
        ) : null}

        <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-cyan-400/15 bg-ink-950/60 sm:h-80">
          {!prefersReducedMotion ? (
            <Canvas
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              dpr={[1, 1.5]}
              camera={{ position: [0, 0.1, 3.4], fov: 46 }}
              gl={{ antialias: true, alpha: true }}
            >
              <color attach="background" args={["#050b14"]} />
              <SignalHuntScene nodes={SIGNAL_NODES} statuses={statuses} quality="high" />
            </Canvas>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_#0e2230_0%,_#050b14_75%)]" />
          )}

          <div className="absolute inset-0">
            {SIGNAL_NODES.map((node) => {
              const nodeStatus = statuses[node.id] ?? "idle";
              return (
                <button
                  key={node.id}
                  type="button"
                  data-status={nodeStatus}
                  disabled={phase !== "playing" || nodeStatus !== "idle"}
                  onClick={() => resolveNode(node)}
                  aria-label={`Transmission ${node.label}`}
                  style={{ left: `${node.xPercent}%`, top: `${node.yPercent}%` }}
                  className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[9px] font-semibold uppercase tracking-wide text-white shadow-lg transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:pointer-events-none data-[status=idle]:border-white/25 data-[status=idle]:bg-white/10 data-[status=idle]:hover:scale-110 data-[status=correct]:scale-0 data-[status=correct]:border-emerald-400 data-[status=correct]:bg-emerald-500/60 data-[status=incorrect]:scale-0 data-[status=incorrect]:border-rose-400 data-[status=incorrect]:bg-rose-500/60"
                >
                  {node.label}
                </button>
              );
            })}
          </div>
        </div>

        {phase === "result" ? (
          <div className="flex flex-col items-center gap-2 pt-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Hunt complete</p>
            <p className="font-display text-3xl font-semibold text-ink-50">{score}% accuracy</p>
            <p className={`text-sm font-semibold ${tier.tone}`}>{tier.label}</p>
            <p className="max-w-md text-sm leading-relaxed text-ink-300">
              Real AI systems filter genuine signal from noise the same way — pattern over volume.
            </p>
          </div>
        ) : null}
      </div>
    </GameFrame>
  );
}
