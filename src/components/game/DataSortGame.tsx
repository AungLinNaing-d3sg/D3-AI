"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { DataSortScene } from "@/components/three/games/DataSortScene";
import { GameFrame } from "@/components/game/GameFrame";
import { Button } from "@/components/ui/Button";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { DataObject, ObjectStatus, Zone } from "@/components/game/DataSortGame.types";

/** Fixed, deterministic field — 5 objects that belong in "Process" (real
 * signal an AI system should learn from) and 3 that belong in "Discard". */
const DATA_OBJECTS: DataObject[] = [
  { id: "o1", kind: "data", label: "DATA-A", positive: true, xPercent: 14, yPercent: 22, depth: -0.3 },
  { id: "o2", kind: "knowledge", label: "KNOWLEDGE-A", positive: true, xPercent: 38, yPercent: 16, depth: 0.2 },
  { id: "o3", kind: "signal", label: "SIGNAL-A", positive: true, xPercent: 62, yPercent: 18, depth: -0.1 },
  { id: "o4", kind: "noise", label: "NOISE-A", positive: false, xPercent: 86, yPercent: 24, depth: 0.3 },
  { id: "o5", kind: "data", label: "DATA-B", positive: true, xPercent: 22, yPercent: 55, depth: 0.15 },
  { id: "o6", kind: "error", label: "ERROR-A", positive: false, xPercent: 50, yPercent: 52, depth: -0.25 },
  { id: "o7", kind: "knowledge", label: "KNOWLEDGE-B", positive: true, xPercent: 78, yPercent: 54, depth: 0.2 },
  { id: "o8", kind: "noise", label: "NOISE-B", positive: false, xPercent: 34, yPercent: 84, depth: -0.15 },
];

const PROCESS_ZONE = { xPercent: 14, yPercent: 88 };
const DISCARD_ZONE = { xPercent: 86, yPercent: 88 };
const WRONG_PENALTY = 8;
const FLASH_DURATION_MS = 400;

type Phase = "ready" | "playing" | "result";
type ResolutionMap = Record<string, Zone | null>;

function idleResolutions(): ResolutionMap {
  return Object.fromEntries(DATA_OBJECTS.map((object) => [object.id, null]));
}

interface DataSortGameProps {
  onFinish: (accuracy: number) => void;
  onExit: () => void;
}

/**
 * Mini-game 4 of 4 — "DATA SORT". A field of floating data objects (cubes,
 * dodecahedra, tetrahedra for genuine DATA/KNOWLEDGE/SIGNAL; icosahedra/
 * octahedra for NOISE/ERROR) drifts between two glowing processing rings.
 * Two-step, keyboard-friendly interaction: select an object, then choose
 * "Process" or "Discard" — correct choices fly the object into its ring and
 * dissolve it; wrong choices shake/flash red and stay in the field for
 * another try, so the player is never stuck. The 3D field
 * (`DataSortScene`, components/three/games/DataSortScene.tsx) is decorative/
 * `aria-hidden`; the real interaction is the accessible button grid on top.
 */
export function DataSortGame({ onFinish, onExit }: DataSortGameProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>("ready");
  const [resolutions, setResolutions] = useState<ResolutionMap>(idleResolutions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [flashId, setFlashId] = useState<string | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    },
    []
  );

  const resolvedCount = useMemo(() => Object.values(resolutions).filter((zone) => zone !== null).length, [resolutions]);

  const start = useCallback(() => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setResolutions(idleResolutions());
    setSelectedId(null);
    setWrongAttempts(0);
    setFlashId(null);
    setPhase("playing");
  }, []);

  const score = useMemo(() => Math.max(0, Math.min(100, 100 - wrongAttempts * WRONG_PENALTY)), [wrongAttempts]);

  useEffect(() => {
    if (phase === "result") onFinish(score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const selectObject = useCallback(
    (object: DataObject) => {
      if (phase !== "playing" || resolutions[object.id]) return;
      setSelectedId((current) => (current === object.id ? null : object.id));
    },
    [phase, resolutions]
  );

  const sendToZone = useCallback(
    (zone: Zone) => {
      if (phase !== "playing" || !selectedId) return;
      const object = DATA_OBJECTS.find((item) => item.id === selectedId);
      if (!object) return;
      const correctZone: Zone = object.positive ? "process" : "discard";

      if (zone === correctZone) {
        const next = { ...resolutions, [object.id]: zone };
        setResolutions(next);
        setSelectedId(null);
        const total = Object.values(next).filter((value) => value !== null).length;
        if (total >= DATA_OBJECTS.length) setPhase("result");
        return;
      }

      setWrongAttempts((count) => count + 1);
      setFlashId(object.id);
      setSelectedId(null);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => setFlashId(null), FLASH_DURATION_MS);
    },
    [phase, selectedId, resolutions]
  );

  const statuses = useMemo(() => {
    const map: Record<string, ObjectStatus> = {};
    DATA_OBJECTS.forEach((object) => {
      if (resolutions[object.id]) map[object.id] = "resolved";
      else if (object.id === flashId) map[object.id] = "flash";
      else if (object.id === selectedId) map[object.id] = "selected";
      else map[object.id] = "idle";
    });
    return map;
  }, [resolutions, flashId, selectedId]);

  const tier =
    score >= 90
      ? { label: "Pipeline optimised", tone: "text-emerald-400" }
      : score >= 60
        ? { label: "Model improving", tone: "text-amber-300" }
        : { label: "Needs cleaner data", tone: "text-ink-300" };

  const status =
    phase === "playing"
      ? `${resolvedCount} of ${DATA_OBJECTS.length} objects classified. ${
          selectedId ? `${DATA_OBJECTS.find((o) => o.id === selectedId)?.label ?? ""} selected.` : "No object selected."
        }`
      : phase === "result"
        ? `Sort complete. ${score} percent accuracy, rated ${tier.label}.`
        : "";

  return (
    <GameFrame
      eyebrow="Mini-game 4 · Data Sort"
      title="Classify the data universe"
      description="Select an object, then choose Process for real DATA/KNOWLEDGE/SIGNAL, or Discard for NOISE/ERROR."
      status={status}
      accentClassName="text-amber-300"
      borderClassName="border-amber-400/20"
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
            <span>Classified {resolvedCount}/{DATA_OBJECTS.length}</span>
            <span>{wrongAttempts} retries</span>
          </div>
        ) : null}

        <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-amber-400/20 bg-ink-950/60 sm:h-80">
          {!prefersReducedMotion ? (
            <Canvas
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              dpr={[1, 1.5]}
              camera={{ position: [0, 0, 3.6], fov: 46 }}
              gl={{ antialias: true, alpha: true }}
            >
              <color attach="background" args={["#120d05"]} />
              <DataSortScene
                objects={DATA_OBJECTS}
                statuses={statuses}
                processZone={PROCESS_ZONE}
                discardZone={DISCARD_ZONE}
                quality="high"
              />
            </Canvas>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_#2a2008_0%,_#120d05_75%)]" />
          )}

          <div className="absolute inset-0">
            {DATA_OBJECTS.map((object) => {
              const objectStatus = statuses[object.id] ?? "idle";
              return (
                <button
                  key={object.id}
                  type="button"
                  data-status={objectStatus}
                  disabled={phase !== "playing" || objectStatus === "resolved"}
                  onClick={() => selectObject(object)}
                  aria-pressed={objectStatus === "selected"}
                  aria-label={`Data object ${object.label}`}
                  style={{ left: `${object.xPercent}%`, top: `${object.yPercent}%` }}
                  className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[8px] font-semibold uppercase tracking-wide text-white shadow-lg transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:pointer-events-none data-[status=idle]:border-white/25 data-[status=idle]:bg-white/10 data-[status=idle]:hover:scale-110 data-[status=selected]:scale-125 data-[status=selected]:border-white data-[status=selected]:bg-white/30 data-[status=flash]:border-rose-400 data-[status=flash]:bg-rose-500/50 data-[status=resolved]:scale-0"
                >
                  {object.label}
                </button>
              );
            })}

            <button
              type="button"
              disabled={phase !== "playing" || !selectedId}
              onClick={() => sendToZone("process")}
              style={{ left: `${PROCESS_ZONE.xPercent}%`, top: `${PROCESS_ZONE.yPercent}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400/60 bg-emerald-500/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200 shadow-lg transition-transform duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:pointer-events-none disabled:opacity-50"
            >
              Process
            </button>
            <button
              type="button"
              disabled={phase !== "playing" || !selectedId}
              onClick={() => sendToZone("discard")}
              style={{ left: `${DISCARD_ZONE.xPercent}%`, top: `${DISCARD_ZONE.yPercent}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-400/60 bg-rose-500/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-200 shadow-lg transition-transform duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:pointer-events-none disabled:opacity-50"
            >
              Discard
            </button>
          </div>
        </div>

        {phase === "result" ? (
          <div className="flex flex-col items-center gap-2 pt-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">Sort complete</p>
            <p className="font-display text-3xl font-semibold text-ink-50">{score}% accuracy</p>
            <p className={`text-sm font-semibold ${tier.tone}`}>{tier.label}</p>
            <p className="max-w-md text-sm leading-relaxed text-ink-300">
              Clean classification is the first step in every real AI pipeline — process what matters, discard what
              doesn&rsquo;t.
            </p>
          </div>
        ) : null}
      </div>
    </GameFrame>
  );
}
