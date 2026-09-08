"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@/components/ui/Button";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { gameItemDefinitions } from "@/data/journey";
import type { GameItemDefinition } from "@/types";

type GameStatus = "idle" | "playing" | "finished" | "skipped";

const GAME_DURATION_SECONDS = 20;
const POSITIVE_SCORE = 9;
const NEGATIVE_SCORE = 14;
const SPAWN_INTERVAL_MS = 650;
const FALL_DURATION_MS = 4200;
const CATCH_ZONE = 0.82;
const CATCH_TOLERANCE = 7;

interface ActiveItem {
  id: number;
  def: GameItemDefinition;
  xPercent: number;
  el: HTMLDivElement;
  spawnedAt: number;
  resolved: boolean;
}

/**
 * Chapter 06 — "TRAIN YOUR AI" mini-game. The player steers an AI agent
 * (arrow keys, on-screen buttons, or drag) to collect DATA/KNOWLEDGE/
 * EXPERIENCE and avoid NOISE/ERROR/BIAS, ending with a trained "accuracy"
 * result — a playful, on-theme dramatisation of how the company's real AI
 * work depends on data quality, not a generic arcade game.
 *
 * Deliberately dependency-free (no game engine/physics library): item
 * positions are mutated directly on their DOM nodes inside a single
 * `requestAnimationFrame` loop, kept out of React state, so the loop stays
 * smooth even on modest devices; only score/timer/status — which change at
 * most a few times a second — go through `useState`.
 */
export function TrainYourAI() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [status, setStatus] = useState<GameStatus>("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SECONDS);

  const trackRef = useRef<HTMLDivElement>(null);
  const agentRef = useRef<HTMLDivElement>(null);
  const agentXRef = useRef(50);
  const keysRef = useRef({ left: false, right: false });
  const itemsRef = useRef<ActiveItem[]>([]);
  const nextIdRef = useRef(0);
  const scoreRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastSpawnRef = useRef(0);
  const lastFrameRef = useRef(0);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    agentXRef.current = 50;
    setScore(0);
    setTimeLeft(GAME_DURATION_SECONDS);
    setStatus("playing");
  }, []);

  const skipGame = useCallback(() => setStatus("skipped"), []);

  useEffect(() => {
    if (status !== "playing") return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") keysRef.current.left = true;
      if (event.key === "ArrowRight") keysRef.current.right = true;
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") keysRef.current.left = false;
      if (event.key === "ArrowRight") keysRef.current.right = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [status]);

  useEffect(() => {
    if (status !== "playing") return;
    const interval = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(interval);
          setStatus("finished");
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (status !== "playing") return;
    const track = trackRef.current;
    if (!track) return;

    lastFrameRef.current = performance.now();
    lastSpawnRef.current = performance.now();

    function spawnItem(now: number) {
      if (!track) return;
      const def = gameItemDefinitions[Math.floor(Math.random() * gameItemDefinitions.length)];
      if (!def) return;

      const el = document.createElement("div");
      el.textContent = def.label;
      el.setAttribute("aria-hidden", "true");
      el.className =
        def.polarity === "positive"
          ? "absolute -translate-x-1/2 rounded-full bg-brand-500/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-lg"
          : "absolute -translate-x-1/2 rounded-full border border-red-400/50 bg-ink-700/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-200 shadow-lg";
      const xPercent = 8 + Math.random() * 84;
      el.style.left = `${xPercent}%`;
      el.style.top = "-10%";
      track.appendChild(el);
      itemsRef.current.push({ id: nextIdRef.current++, def, xPercent, el, spawnedAt: now, resolved: false });
    }

    function tick(now: number) {
      const delta = now - lastFrameRef.current;
      lastFrameRef.current = now;

      if (now - lastSpawnRef.current > SPAWN_INTERVAL_MS) {
        spawnItem(now);
        lastSpawnRef.current = now;
      }

      const speed = 0.1 * delta;
      if (keysRef.current.left) agentXRef.current = Math.max(6, agentXRef.current - speed);
      if (keysRef.current.right) agentXRef.current = Math.min(94, agentXRef.current + speed);
      if (agentRef.current) agentRef.current.style.left = `${agentXRef.current}%`;

      itemsRef.current = itemsRef.current.filter((item) => {
        const progress = (now - item.spawnedAt) / FALL_DURATION_MS;
        if (item.resolved || progress >= 1) {
          item.el.remove();
          return false;
        }
        item.el.style.top = `${progress * 100}%`;

        if (progress >= CATCH_ZONE && Math.abs(item.xPercent - agentXRef.current) < CATCH_TOLERANCE) {
          item.resolved = true;
          item.el.remove();
          const delta2 = item.def.polarity === "positive" ? POSITIVE_SCORE : -NEGATIVE_SCORE;
          scoreRef.current = Math.min(100, Math.max(0, scoreRef.current + delta2));
          setScore(scoreRef.current);
          return false;
        }
        return true;
      });

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      itemsRef.current.forEach((item) => item.el.remove());
      itemsRef.current = [];
    };
  }, [status]);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (status !== "playing") return;
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const percent = ((event.clientX - rect.left) / rect.width) * 100;
      agentXRef.current = Math.min(94, Math.max(6, percent));
    },
    [status]
  );

  const nudgeAgent = useCallback((direction: -1 | 1) => {
    agentXRef.current = Math.min(94, Math.max(6, agentXRef.current + direction * 9));
  }, []);

  const accuracyTier = useMemo(() => {
    if (score >= 80) return { label: "Production-ready", tone: "text-emerald-400" };
    if (score >= 50) return { label: "Promising model", tone: "text-brand-300" };
    return { label: "Needs more training data", tone: "text-ink-300" };
  }, [score]);

  return (
    <div className="flex w-full flex-col items-center gap-6">
      {status === "idle" ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center sm:p-10">
          <h3 className="font-display text-2xl font-semibold text-ink-50">Train your AI</h3>
          <p className="max-w-md text-sm leading-relaxed text-ink-300">
            Steer your AI agent with the arrow keys (or drag) to collect DATA, KNOWLEDGE, and EXPERIENCE — and
            dodge NOISE, ERROR, and BIAS. {GAME_DURATION_SECONDS} seconds on the clock.
          </p>
          {prefersReducedMotion ? (
            <p className="text-xs text-ink-500">
              This mini-game includes motion. Choose &ldquo;Skip&rdquo; if you&rsquo;d prefer not to play.
            </p>
          ) : null}
          <div className="flex gap-3">
            <Button onClick={startGame}>Play</Button>
            <Button variant="secondary" onClick={skipGame}>
              Skip
            </Button>
          </div>
        </div>
      ) : null}

      {status === "playing" ? (
        <div className="flex w-full max-w-xl flex-col gap-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-ink-300">
            <span>Accuracy {score}%</span>
            <span>{timeLeft}s</span>
          </div>

          <div
            ref={trackRef}
            onPointerMove={onPointerMove}
            role="img"
            aria-label={`Training in progress. Accuracy ${score} percent. ${timeLeft} seconds remaining.`}
            className="relative h-80 w-full touch-none overflow-hidden rounded-3xl border border-white/10 bg-ink-950/60 sm:h-96"
          >
            <div
              ref={agentRef}
              aria-hidden="true"
              style={{ left: "50%" }}
              className="absolute bottom-4 h-8 w-8 -translate-x-1/2 rounded-full bg-gradient-to-br from-brand-300 to-brand-600 shadow-[0_0_20px_4px_rgba(241,74,48,0.5)]"
            />
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => nudgeAgent(-1)}
              aria-label="Move AI agent left"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={() => nudgeAgent(1)}
              aria-label="Move AI agent right"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              ▶
            </button>
            <Button variant="ghost" onClick={skipGame}>
              Skip
            </Button>
          </div>
        </div>
      ) : null}

      {status === "finished" ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-400">AI trained</p>
          <h3 className="font-display text-3xl font-semibold text-ink-50">{score}% accuracy</h3>
          <p className={`text-sm font-semibold ${accuracyTier.tone}`}>{accuracyTier.label}</p>
          <p className="max-w-md text-sm leading-relaxed text-ink-300">
            Real AI systems improve the same way: more good data and experience, less noise, error, and bias.
            Keep scrolling to see where that takes us.
          </p>
          <Button variant="secondary" onClick={startGame}>
            Train again
          </Button>
        </div>
      ) : null}

      {status === "skipped" ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center sm:p-10">
          <p className="text-sm text-ink-300">Skipped — keep scrolling to continue the journey.</p>
          <Button variant="ghost" onClick={startGame}>
            Play instead
          </Button>
        </div>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {status === "finished" ? `Training complete. Accuracy ${score} percent, rated ${accuracyTier.label}.` : ""}
      </p>
    </div>
  );
}
