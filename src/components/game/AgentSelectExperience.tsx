"use client";

import { useCallback, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { AgentNodeScene, type AgentNodeLayout } from "@/components/three/experiences/AgentNodeScene";
import { GameFrame } from "@/components/game/GameFrame";
import { Button } from "@/components/ui/Button";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import { useWebglSupported } from "@/hooks/useWebglSupported";
import { AGENTS, WORKFLOW_STAGES } from "@/data/journey";
import type { AgentId } from "@/types";

/** Fixed, hand-authored radial layout (no `Math.random()`) — 4 real agents
 * arranged around the central "AI system" hub, matching reading order in
 * `.claude/agents/*.md`. */
const NODE_LAYOUT: AgentNodeLayout[] = [
  { id: "senior-frontend-dev", xPercent: 22, yPercent: 24 },
  { id: "senior-qa", xPercent: 78, yPercent: 24 },
  { id: "senior-security-engineer", xPercent: 78, yPercent: 76 },
  { id: "report-manager", xPercent: 22, yPercent: 76 },
];

const SHORT_LABEL: Record<AgentId, string> = {
  "senior-frontend-dev": "FRONTEND DEV",
  "senior-qa": "QA",
  "senior-security-engineer": "SECURITY",
  "report-manager": "REPORT MGR",
};

interface AgentSelectExperienceProps {
  onAdvance: () => void;
  onExit: () => void;
}

/**
 * Experience 1 of 4 — "CHOOSE YOUR AI AGENT". The 4 real subagents defined in
 * `.claude/agents/*.md` (see data/journey.ts `AGENTS`) rendered as
 * interactive AI nodes around a central "AI system" hub rather than a card
 * grid. Selecting a node focuses the decorative 3D scene toward it, reveals
 * that agent's real responsibility text and which real `ai_workflow.sh`
 * stages it powers (data/journey.ts `WORKFLOW_STAGES`), and connects it to
 * the hub — the accessible interaction (button grid + `aria-live` status)
 * carries the meaning; the `@react-three/fiber` canvas is purely decorative.
 */
export function AgentSelectExperience({ onAdvance, onExit }: AgentSelectExperienceProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const webglSupported = useWebglSupported();
  const { isCompact } = useDeviceCapability();
  const [hoveredId, setHoveredId] = useState<AgentId | null>(null);
  const [selectedId, setSelectedId] = useState<AgentId | null>(null);

  const colors = useMemo(
    () => Object.fromEntries(AGENTS.map((agent) => [agent.id, agent.accentHex])) as Record<AgentId, string>,
    []
  );

  const selectedAgent = useMemo(() => AGENTS.find((agent) => agent.id === selectedId) ?? null, [selectedId]);
  const poweredStages = useMemo(
    () => (selectedId ? WORKFLOW_STAGES.filter((stage) => stage.agentId === selectedId) : []),
    [selectedId]
  );

  const selectAgent = useCallback((id: AgentId) => setSelectedId(id), []);
  const reset = useCallback(() => {
    setSelectedId(null);
    setHoveredId(null);
  }, []);

  const showCanvas = !prefersReducedMotion && webglSupported;

  const status = selectedAgent
    ? `${selectedAgent.role} selected. ${selectedAgent.description} Connected to the central AI system.`
    : "";

  return (
    <GameFrame
      eyebrow="01 · Choose your AI agent"
      title="Meet the real agents behind this repo"
      description="Four specialist subagents drive this project's own AI development pipeline. Select one to see its real responsibility."
      status={status}
      accentClassName="text-brand-400"
      borderClassName="border-brand-400/20"
      controls={
        selectedAgent ? (
          <>
            <Button onClick={onAdvance}>Next Step</Button>
            <Button variant="secondary" onClick={reset}>
              Run Again
            </Button>
            <Button variant="ghost" onClick={onExit}>
              Back to AI Playground
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onExit}>
            Back to AI Playground
          </Button>
        )
      }
    >
      <div className="flex w-full max-w-2xl flex-col gap-4">
        <div className="relative h-80 w-full overflow-hidden rounded-2xl border border-brand-400/15 bg-ink-950/60 sm:h-96">
          {showCanvas ? (
            <Canvas
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              dpr={isCompact ? [1, 1] : [1, 1.5]}
              camera={{ position: [0, 0.15, 3.6], fov: 46 }}
              gl={{ antialias: !isCompact, alpha: true }}
            >
              <color attach="background" args={["#050914"]} />
              <AgentNodeScene layouts={NODE_LAYOUT} colors={colors} hoveredId={hoveredId} selectedId={selectedId} quality={isCompact ? "low" : "high"} />
            </Canvas>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#1a1030_0%,_#050914_75%)]" />
          )}

          {/* Connector lines + hub — rendered in both motion states so the
              "network" reads even when the decorative canvas is skipped. */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            {NODE_LAYOUT.map((node) => {
              const active = node.id === selectedId || node.id === hoveredId;
              return (
                <line
                  key={node.id}
                  x1="50%"
                  y1="50%"
                  x2={`${node.xPercent}%`}
                  y2={`${node.yPercent}%`}
                  stroke={active ? colors[node.id] : "#4b5468"}
                  strokeOpacity={active ? 0.75 : 0.25}
                  strokeWidth={active ? 2 : 1}
                />
              );
            })}
          </svg>

          <div
            className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-white/20 bg-white/[0.06] text-center backdrop-blur"
            aria-hidden="true"
          >
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-200">AI</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-200">System</span>
          </div>

          <div className="absolute inset-0">
            {NODE_LAYOUT.map((node) => {
              const agent = AGENTS.find((candidate) => candidate.id === node.id);
              if (!agent) return null;
              const isSelected = node.id === selectedId;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => selectAgent(node.id)}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId((current) => (current === node.id ? null : current))}
                  onFocus={() => setHoveredId(node.id)}
                  onBlur={() => setHoveredId((current) => (current === node.id ? null : current))}
                  aria-pressed={isSelected}
                  aria-label={`Select ${agent.name} — ${agent.role}`}
                  style={{ left: `${node.xPercent}%`, top: `${node.yPercent}%` }}
                  className={`absolute flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border text-center text-[9px] font-semibold uppercase leading-tight tracking-wide text-white shadow-lg transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:h-24 sm:w-24 ${
                    isSelected
                      ? "scale-110 border-white/70 bg-white/15"
                      : "border-white/25 bg-white/10 pointer-fine:hover:scale-105 pointer-fine:hover:border-white/50"
                  }`}
                >
                  {SHORT_LABEL[node.id]}
                </button>
              );
            })}
          </div>
        </div>

        {selectedAgent ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-lg font-semibold text-ink-50">
                {selectedAgent.name} <span className="text-ink-400">· {selectedAgent.role}</span>
              </p>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-300">
                {selectedAgent.accessLabel}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-ink-300">{selectedAgent.description}</p>
            <div className="flex flex-wrap gap-2">
              {selectedAgent.tools.map((tool) => (
                <span key={tool} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-300">
                  {tool}
                </span>
              ))}
            </div>
            {poweredStages.length > 0 ? (
              <div className="border-t border-white/10 pt-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Next in the real workflow</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-300">
                  This agent runs the{" "}
                  {poweredStages.map((stage, index) => (
                    <span key={stage.id}>
                      {index > 0 ? ", " : ""}
                      <span className="font-semibold text-ink-100">{stage.label}</span>
                    </span>
                  ))}{" "}
                  stage{poweredStages.length > 1 ? "s" : ""} of <code className="text-ink-100">ai_workflow.sh</code>.
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-center text-sm leading-relaxed text-ink-300">
            Hover or select any node to focus the AI system on that agent.
          </p>
        )}
      </div>
    </GameFrame>
  );
}
