"use client";

import { useEffect, useRef } from "react";
import { setPlaygroundActivity, signalPlayground } from "@/lib/motion/playgroundState";

/**
 * One-way reporting from the AI Playground experiences to the chapter's
 * background environment (lib/motion/playgroundState.ts →
 * three/scenes/GameAmbienceScene.tsx). Each hook only *observes* state the
 * experience already has — it never feeds anything back into it — so game
 * behaviour is unchanged.
 */

type RunPhase = "ready" | "running" | "complete";

const ACTIVITY: Record<RunPhase, number> = { ready: 0.3, running: 1, complete: 0.45 };

/** Workflow / Build & Test / Review & Ship: the run phase drives how busy the
 * background is; finishing a run plays a short success response. */
export function usePlaygroundRunSignal(phase: RunPhase) {
  const previous = useRef<RunPhase>(phase);
  useEffect(() => {
    setPlaygroundActivity(ACTIVITY[phase]);
    if (phase === "complete" && previous.current === "running") signalPlayground("success");
    previous.current = phase;
  }, [phase]);
  useEffect(() => () => setPlaygroundActivity(0), []);
}

/** Agent Network: choosing an agent sends a subtle energy response. */
export function usePlaygroundSelectSignal(selectedId: string | null) {
  useEffect(() => {
    setPlaygroundActivity(selectedId ? 0.5 : 0.3);
    if (selectedId) signalPlayground("select");
  }, [selectedId]);
  useEffect(() => () => setPlaygroundActivity(0), []);
}

/** A real failure in the run (Build & Test's failing test before its fix)
 * sends a brief amber disturbance. */
export function usePlaygroundFailureSignal(failing: boolean) {
  useEffect(() => {
    if (failing) signalPlayground("failure");
  }, [failing]);
}
