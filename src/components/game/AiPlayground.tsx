"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TrainYourAI } from "@/components/game/TrainYourAI";
import { SignalHuntGame } from "@/components/game/SignalHuntGame";
import { NeuralPathGame } from "@/components/game/NeuralPathGame";
import { DataSortGame } from "@/components/game/DataSortGame";
import { playgroundGames } from "@/data/journey";
import { resetPlaygroundAccent, setPlaygroundAccent } from "@/lib/motion/playgroundState";
import type { PlaygroundGameId } from "@/types";

type CompletionMap = Partial<Record<PlaygroundGameId, number>>;

const accentTextClass: Record<PlaygroundGameId, string> = {
  train: "text-brand-400",
  "signal-hunt": "text-cyan-300",
  "neural-path": "text-violet-300",
  "data-sort": "text-amber-300",
};

const accentBorderClass: Record<PlaygroundGameId, string> = {
  train: "border-brand-400/40 hover:border-brand-400/70",
  "signal-hunt": "border-cyan-400/30 hover:border-cyan-400/70",
  "neural-path": "border-violet-400/30 hover:border-violet-400/70",
  "data-sort": "border-amber-400/30 hover:border-amber-400/70",
};

/**
 * Chapter 07 — "THE AI PLAYGROUND". One cohesive interactive chapter built
 * from 4 experiences: the existing "Train Your AI" catcher plus 3 new,
 * self-contained 3D mini-games (Signal Hunt, Neural Path, Data Sort). A
 * cinematic menu introduces all four as one continuous idea rather than
 * unrelated widgets; picking one hands off into that game's own
 * ready → playing → result flow (each with explicit Play/Replay/Skip
 * controls, so the user is never trapped), then hands back to this menu,
 * which doubles as the natural on-ramp back into the scrollytelling journey.
 *
 * Each game owns its own small, self-contained `@react-three/fiber` canvas
 * (see components/game/*Game.tsx) rather than the shared, fixed background
 * canvas (components/three/SceneCanvas.tsx) — the shared canvas stays purely
 * decorative/`aria-hidden` and cannot itself carry click-driven gameplay
 * (see three/scenes/GameAmbienceScene.tsx), so each game gets a real,
 * self-contained 3D scene it can safely raycast/interact with, while its
 * accessible HTML button grid carries the actual interaction.
 */
export function AiPlayground() {
  const [activeGame, setActiveGame] = useState<PlaygroundGameId | null>(null);
  const [completed, setCompleted] = useState<CompletionMap>({});

  const activeDefinition = useMemo(
    () => playgroundGames.find((game) => game.id === activeGame) ?? null,
    [activeGame]
  );

  useEffect(() => {
    if (activeDefinition) setPlaygroundAccent(activeDefinition.accentHex);
    else resetPlaygroundAccent();
    return () => resetPlaygroundAccent();
  }, [activeDefinition]);

  const selectGame = useCallback((id: PlaygroundGameId) => setActiveGame(id), []);
  const backToMenu = useCallback(() => setActiveGame(null), []);
  const recordCompletion = useCallback((id: PlaygroundGameId, accuracy: number) => {
    setCompleted((previous) => ({ ...previous, [id]: accuracy }));
  }, []);

  const completedCount = Object.keys(completed).length;

  if (activeGame === "train") {
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <TrainYourAI />
        <button
          type="button"
          onClick={backToMenu}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400 underline-offset-4 hover:text-ink-100 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          ← Back to the AI Playground
        </button>
      </div>
    );
  }

  if (activeGame === "signal-hunt") {
    return (
      <SignalHuntGame
        onFinish={(accuracy) => recordCompletion("signal-hunt", accuracy)}
        onExit={backToMenu}
      />
    );
  }

  if (activeGame === "neural-path") {
    return (
      <NeuralPathGame
        onFinish={(accuracy) => recordCompletion("neural-path", accuracy)}
        onExit={backToMenu}
      />
    );
  }

  if (activeGame === "data-sort") {
    return (
      <DataSortGame onFinish={(accuracy) => recordCompletion("data-sort", accuracy)} onExit={backToMenu} />
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <p className="max-w-xl text-balance text-center text-sm leading-relaxed text-ink-300 sm:text-base">
        Four ways to think like an AI. Hunt real signal, route a neural network, sort a data universe, or train an
        agent from scratch — play one, or play them all.
      </p>

      <ul className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        {playgroundGames.map((game) => {
          const accuracy = completed[game.id];
          return (
            <li key={game.id}>
              <button
                type="button"
                onClick={() => selectGame(game.id)}
                aria-label={`Play ${game.title}`}
                className={`group flex h-full w-full flex-col items-start gap-2 rounded-2xl border bg-white/[0.03] p-6 text-left transition-all duration-300 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${accentBorderClass[game.id]}`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-[0.24em] ${accentTextClass[game.id]}`}>
                    {String(game.index).padStart(2, "0")}
                  </span>
                  {accuracy !== undefined ? (
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                      {accuracy}% cleared
                    </span>
                  ) : null}
                </div>
                <p className="font-display text-lg font-semibold text-ink-50">{game.title}</p>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{game.tagline}</p>
                <p className="text-sm leading-relaxed text-ink-300">{game.description}</p>
                <span
                  className={`mt-auto inline-flex items-center gap-1 pt-2 text-xs font-semibold uppercase tracking-[0.2em] ${accentTextClass[game.id]}`}
                >
                  Play
                  <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p aria-live="polite" className="sr-only">
        {completedCount > 0 ? `${completedCount} of ${playgroundGames.length} playground experiences completed.` : ""}
      </p>
    </div>
  );
}
