"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { NeuralPathScene } from "@/components/three/games/NeuralPathScene";
import { GameFrame } from "@/components/game/GameFrame";
import { Button } from "@/components/ui/Button";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { nodeVisual, type PathNode } from "@/components/game/NeuralPathGame.types";

interface LayerDefinition {
  title: string;
  nodes: PathNode[];
}

/** 4 junctions, 3 choices each — exactly one correct connection per junction.
 * Fixed/deterministic (no randomness) so the challenge is fair and markup
 * never mismatches between server and client. */
const LAYERS: LayerDefinition[] = [
  {
    title: "Ingest",
    nodes: [
      { id: "l0-data", layer: 0, label: "DATA", correct: true, xPercent: 12, yPercent: 22 },
      { id: "l0-spam", layer: 0, label: "SPAM", correct: false, xPercent: 12, yPercent: 50 },
      { id: "l0-corrupt", layer: 0, label: "CORRUPT", correct: false, xPercent: 12, yPercent: 78 },
    ],
  },
  {
    title: "Process",
    nodes: [
      { id: "l1-outlier", layer: 1, label: "OUTLIER", correct: false, xPercent: 38, yPercent: 22 },
      { id: "l1-pattern", layer: 1, label: "PATTERN", correct: true, xPercent: 38, yPercent: 50 },
      { id: "l1-duplicate", layer: 1, label: "DUPLICATE", correct: false, xPercent: 38, yPercent: 78 },
    ],
  },
  {
    title: "Reason",
    nodes: [
      { id: "l2-guess", layer: 2, label: "GUESS", correct: false, xPercent: 64, yPercent: 22 },
      { id: "l2-loop", layer: 2, label: "LOOP", correct: false, xPercent: 64, yPercent: 50 },
      { id: "l2-inference", layer: 2, label: "INFERENCE", correct: true, xPercent: 64, yPercent: 78 },
    ],
  },
  {
    title: "Decide",
    nodes: [
      { id: "l3-action", layer: 3, label: "ACTION", correct: true, xPercent: 90, yPercent: 22 },
      { id: "l3-stall", layer: 3, label: "STALL", correct: false, xPercent: 90, yPercent: 50 },
      { id: "l3-error", layer: 3, label: "ERROR", correct: false, xPercent: 90, yPercent: 78 },
    ],
  },
];

const ALL_NODES = LAYERS.flatMap((layer) => layer.nodes);
const WRONG_PENALTY = 12;
const FLASH_DURATION_MS = 450;

type Phase = "ready" | "playing" | "result";

interface NeuralPathGameProps {
  onFinish: (accuracy: number) => void;
  onExit: () => void;
}

/**
 * Mini-game 3 of 4 — "NEURAL PATH". A 4-junction neural-network maze: the
 * player must pick the strongest connection at every junction to build one
 * unbroken, intelligent path from raw input to a final decision. Wrong picks
 * flash red and simply stay at the same junction (never trapped, no lives to
 * lose) but cost a little final accuracy — favouring exploration over
 * punishing failure. The 3D graph (`NeuralPathScene`,
 * components/three/games/NeuralPathScene.tsx) is decorative/`aria-hidden`;
 * the real interaction is the accessible button grid on top.
 */
export function NeuralPathGame({ onFinish, onExit }: NeuralPathGameProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>("ready");
  const [currentLayer, setCurrentLayer] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [flashId, setFlashId] = useState<string | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    },
    []
  );

  const start = useCallback(() => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setCurrentLayer(0);
    setWrongAttempts(0);
    setFlashId(null);
    setPhase("playing");
  }, []);

  const score = useMemo(() => Math.max(20, Math.min(100, 100 - wrongAttempts * WRONG_PENALTY)), [wrongAttempts]);

  useEffect(() => {
    if (phase === "result") onFinish(score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const chooseNode = useCallback(
    (node: PathNode) => {
      if (phase !== "playing" || node.layer !== currentLayer) return;
      if (node.correct) {
        const nextLayer = currentLayer + 1;
        setCurrentLayer(nextLayer);
        if (nextLayer >= LAYERS.length) setPhase("result");
        return;
      }
      setWrongAttempts((count) => count + 1);
      setFlashId(node.id);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => setFlashId(null), FLASH_DURATION_MS);
    },
    [phase, currentLayer]
  );

  const tier =
    score >= 90
      ? { label: "Optimal pathway", tone: "text-emerald-400" }
      : score >= 60
        ? { label: "Stable network", tone: "text-violet-300" }
        : { label: "Path found — with detours", tone: "text-ink-300" };

  const status =
    phase === "playing"
      ? `Junction ${Math.min(currentLayer + 1, LAYERS.length)} of ${LAYERS.length}. ${wrongAttempts} wrong ${
          wrongAttempts === 1 ? "turn" : "turns"
        } so far.`
      : phase === "result"
        ? `Network activated. ${score} percent path accuracy, rated ${tier.label}.`
        : "";

  return (
    <GameFrame
      eyebrow="Mini-game 3 · Neural Path"
      title="Route the network"
      description="Pick the strongest connection at each of the 4 junctions to build one unbroken path from input to decision."
      status={status}
      accentClassName="text-violet-300"
      borderClassName="border-violet-400/20"
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
      <div className="flex w-full max-w-2xl flex-col gap-3">
        {phase === "playing" ? (
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-ink-300">
            <span>{LAYERS[currentLayer]?.title ?? "Activated"}</span>
            <span>
              Junction {Math.min(currentLayer + 1, LAYERS.length)}/{LAYERS.length}
            </span>
          </div>
        ) : null}

        <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-violet-400/20 bg-ink-950/60 sm:h-80">
          {!prefersReducedMotion ? (
            <Canvas
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              dpr={[1, 1.5]}
              camera={{ position: [0, 0, 4.2], fov: 44 }}
              gl={{ antialias: true, alpha: true }}
            >
              <color attach="background" args={["#0a0716"]} />
              <NeuralPathScene nodes={ALL_NODES} currentLayer={currentLayer} flashId={flashId} quality="high" />
            </Canvas>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_#1c1533_0%,_#0a0716_75%)]" />
          )}

          <div className="absolute inset-0">
            {ALL_NODES.map((node) => {
              const visual = nodeVisual(node, currentLayer, flashId);
              const isCurrentLayer = node.layer === currentLayer;
              return (
                <button
                  key={node.id}
                  type="button"
                  data-visual={visual}
                  disabled={phase !== "playing" || !isCurrentLayer}
                  onClick={() => chooseNode(node)}
                  aria-label={`${LAYERS[node.layer]?.title ?? "Junction"}: ${node.label}`}
                  style={{ left: `${node.xPercent}%`, top: `${node.yPercent}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-lg transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 disabled:pointer-events-none data-[visual=locked]:border-white/10 data-[visual=locked]:bg-white/5 data-[visual=locked]:opacity-40 data-[visual=available]:border-violet-300/60 data-[visual=available]:bg-violet-500/20 data-[visual=available]:hover:scale-110 data-[visual=active-path]:border-emerald-400/70 data-[visual=active-path]:bg-emerald-500/20 data-[visual=dormant]:border-white/10 data-[visual=dormant]:bg-white/5 data-[visual=dormant]:opacity-30 data-[visual=flash]:scale-110 data-[visual=flash]:border-rose-400 data-[visual=flash]:bg-rose-500/50"
                >
                  {node.label}
                </button>
              );
            })}
          </div>
        </div>

        {phase === "result" ? (
          <div className="flex flex-col items-center gap-2 pt-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-300">Network activated</p>
            <p className="font-display text-3xl font-semibold text-ink-50">{score}% path accuracy</p>
            <p className={`text-sm font-semibold ${tier.tone}`}>{tier.label}</p>
            <p className="max-w-md text-sm leading-relaxed text-ink-300">
              Every model finds its path the same way — try, adjust, and strengthen the connections that work.
            </p>
          </div>
        ) : null}
      </div>
    </GameFrame>
  );
}
