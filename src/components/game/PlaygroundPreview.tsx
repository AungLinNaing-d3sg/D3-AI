import type { CSSProperties } from "react";
import { AGENTS, WORKFLOW_STAGES } from "@/data/journey";
import type { PlaygroundExperienceId } from "@/types";

/**
 * Miniature, living previews of each playground experience, drawn in SVG
 * and animated purely in CSS (see `.pg-preview` in globals.css) — built
 * from the same real data the full experiences use (`AGENTS`,
 * `WORKFLOW_STAGES`), so each card is a small version of the real thing
 * rather than an icon. Deliberately not four more WebGL canvases: the
 * chapter already has its shared 3D ambience field behind it, and four
 * extra GPU contexts for thumbnails would cost far more than they add.
 *
 * Wake-up is staged by the grid's `data-awake` (set from section
 * visibility in PlaygroundEntry): lines draw in, nodes connect, then the
 * loops start. Every looping keyframe ends on its resting state, so the
 * sitewide reduced-motion rule (which collapses animations to their end)
 * leaves a clean, static preview.
 */

const AGENT_SHORT: Record<string, string> = {
  "senior-frontend-dev": "FRONTEND",
  "senior-qa": "QA",
  "senior-security-engineer": "SECURITY",
  "report-manager": "REPORTS",
};

const STAGE_SHORT: Record<string, string> = {
  implement: "IMPL",
  qa: "QA",
  build: "BUILD",
  "commit-message": "MSG",
  commit: "COMMIT",
  push: "PUSH",
  pr: "PR",
  "report-manager": "REPORT",
  security: "SEC",
};

function delay(seconds: number): CSSProperties {
  return { "--d": `${seconds}s` } as CSSProperties;
}

function AgentNetworkPreview() {
  const hub = { x: 160, y: 92 };
  const positions = [
    { x: 62, y: 44 },
    { x: 258, y: 44 },
    { x: 258, y: 140 },
    { x: 62, y: 140 },
  ];
  return (
    <svg viewBox="0 0 320 184" className="pg-preview-svg" aria-hidden="true">
      {AGENTS.map((agent, i) => {
        const p = positions[i] ?? positions[0]!;
        const d = `M${hub.x} ${hub.y} C ${(hub.x + p.x) / 2} ${hub.y}, ${(hub.x + p.x) / 2} ${p.y}, ${p.x} ${p.y}`;
        return (
          <g key={agent.id}>
            <path d={d} pathLength={1} className="pg-wake-line" style={delay(0.15 + i * 0.12)} />
            <path d={d} pathLength={1} className="pg-flow" style={delay(i * 0.9)} />
          </g>
        );
      })}
      {AGENTS.map((agent, i) => {
        const p = positions[i] ?? positions[0]!;
        const label = AGENT_SHORT[agent.id] ?? agent.name;
        const width = label.length * 6.4 + 22;
        return (
          <g key={agent.id} className="pg-wake-node" style={delay(0.55 + i * 0.12)}>
            <g className="pg-agent" style={delay(i * 0.9)}>
              <rect x={p.x - width / 2} y={p.y - 11} width={width} height={22} rx={11} className="pg-chip" />
              <circle cx={p.x - width / 2 + 11} cy={p.y} r={3} className="pg-chip-dot" />
              <text x={p.x + 5} y={p.y + 3.5} textAnchor="middle" className="pg-label">
                {label}
              </text>
            </g>
          </g>
        );
      })}
      <g className="pg-wake-node" style={delay(0.3)}>
        <circle cx={hub.x} cy={hub.y} r={26} className="pg-hub-ring" />
        <circle cx={hub.x} cy={hub.y} r={17} className="pg-hub" />
        <text x={hub.x} y={hub.y + 3.5} textAnchor="middle" className="pg-label pg-label-strong">
          TASK
        </text>
      </g>
    </svg>
  );
}

function WorkflowPreview() {
  const stages = WORKFLOW_STAGES.slice(0, 9);
  const points = stages.map((_, i) => {
    const row = i < 5 ? 0 : 1;
    const col = row === 0 ? i : 8 - i;
    return { x: 36 + col * 62, y: row === 0 ? 62 : 128 };
  });
  const route = `M${points[0]!.x} ${points[0]!.y} L${points[4]!.x} ${points[4]!.y} C ${points[4]!.x + 34} ${points[4]!.y}, ${points[5]!.x + 34} ${points[5]!.y}, ${points[5]!.x} ${points[5]!.y} L${points[8]!.x} ${points[8]!.y}`;
  return (
    <svg viewBox="0 0 320 184" className="pg-preview-svg" aria-hidden="true">
      <path d={route} pathLength={1} className="pg-wake-line" style={delay(0.1)} />
      <path d={route} pathLength={1} className="pg-progress" />
      {stages.map((stage, i) => {
        const p = points[i]!;
        return (
          <g key={stage.id} className="pg-wake-node" style={delay(0.4 + i * 0.07)}>
            <circle cx={p.x} cy={p.y} r={9} className="pg-stage" style={delay(i * 0.55)} />
            <circle cx={p.x} cy={p.y} r={3} className="pg-stage-core" style={delay(i * 0.55)} />
            <text x={p.x} y={p.y + (i < 5 ? -17 : 25)} textAnchor="middle" className="pg-label">
              {STAGE_SHORT[stage.id] ?? stage.label.toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function BuildTestPreview() {
  const code = [
    [18, 44, 30],
    [30, 26, 58, 22],
    [30, 70, 18],
    [42, 38, 46],
    [30, 54],
    [18, 22],
  ];
  return (
    <svg viewBox="0 0 320 184" className="pg-preview-svg" aria-hidden="true">
      <g className="pg-wake-node" style={delay(0.2)}>
        <rect x={10} y={14} width={176} height={156} rx={8} className="pg-panel" />
        <circle cx={22} cy={26} r={2.4} className="pg-panel-dot" />
        <circle cx={30} cy={26} r={2.4} className="pg-panel-dot" />
        <circle cx={38} cy={26} r={2.4} className="pg-panel-dot" />
        {code.map((line, row) => {
          let x = 22;
          return (
            <g key={row} className="pg-code-line" style={delay(0.5 + row * 0.12)}>
              <text x={14} y={52 + row * 18} className="pg-gutter">
                {row + 1}
              </text>
              {line.map((w, k) => {
                const segment = (
                  <rect
                    key={k}
                    x={x + (k === 0 ? 8 : 0)}
                    y={46 + row * 18}
                    width={w}
                    height={6}
                    rx={3}
                    className={k % 2 === 0 ? "pg-token" : "pg-token pg-token-accent"}
                  />
                );
                x += w + 6 + (k === 0 ? 8 : 0);
                return segment;
              })}
            </g>
          );
        })}
        <rect x={112} y={136} width={2} height={10} className="pg-cursor" />
      </g>
      <g className="pg-wake-node" style={delay(0.45)}>
        <rect x={196} y={14} width={114} height={156} rx={8} className="pg-panel pg-panel-terminal" />
        <text x={206} y={36} className="pg-mono">$ npm test</text>
        <text x={206} y={58} className="pg-mono pg-dim pg-term-line" style={delay(0.9)}>analyze</text>
        <text x={206} y={74} className="pg-mono pg-dim pg-term-line" style={delay(1.1)}>implement</text>
        <text x={206} y={90} className="pg-mono pg-dim pg-term-line" style={delay(1.3)}>test · fix</text>
        <text x={206} y={112} className="pg-mono pg-pass pg-term-line" style={delay(1.6)}>✓ verify</text>
        <rect x={206} y={138} width={94} height={5} rx={2.5} className="pg-bar-track" />
        <rect x={206} y={138} width={94} height={5} rx={2.5} className="pg-bar" />
      </g>
    </svg>
  );
}

function ReviewShipPreview() {
  const diff = [
    { sign: "+", w: 120 },
    { sign: "+", w: 92 },
    { sign: "−", w: 70 },
    { sign: "+", w: 108 },
  ];
  const checks = ["Security", "Report", "PR"];
  return (
    <svg viewBox="0 0 320 184" className="pg-preview-svg" aria-hidden="true">
      <g className="pg-wake-node" style={delay(0.2)}>
        <rect x={10} y={14} width={170} height={156} rx={8} className="pg-panel" />
        <text x={22} y={36} className="pg-mono pg-dim">diff · ai/feature</text>
        {diff.map((line, i) => (
          <g key={i} className="pg-code-line" style={delay(0.5 + i * 0.12)}>
            <rect x={16} y={50 + i * 26} width={158} height={20} rx={4} className={line.sign === "+" ? "pg-diff-add" : "pg-diff-del"} />
            <text x={24} y={64 + i * 26} className="pg-mono">{line.sign}</text>
            <rect x={38} y={57 + i * 26} width={line.w} height={6} rx={3} className="pg-token" />
          </g>
        ))}
      </g>
      {checks.map((label, i) => (
        <g key={label} className="pg-wake-node" style={delay(0.6 + i * 0.15)}>
          <rect x={192} y={22 + i * 40} width={118} height={30} rx={15} className="pg-chip" />
          <circle cx={210} cy={37 + i * 40} r={7} className="pg-check" style={delay(i * 0.8)} />
          <path d={`M${206.5} ${37 + i * 40} l2.5 2.5 l4.5 -5`} className="pg-check-mark" style={delay(i * 0.8)} />
          <text x={224} y={41 + i * 40} className="pg-label">{label.toUpperCase()}</text>
        </g>
      ))}
      <g className="pg-wake-node" style={delay(1.1)}>
        <rect x={192} y={146} width={118} height={24} rx={6} className="pg-ship" />
        <text x={251} y={162} textAnchor="middle" className="pg-label pg-label-strong">READY TO SHIP</text>
      </g>
    </svg>
  );
}

const PREVIEWS: Record<PlaygroundExperienceId, () => React.JSX.Element> = {
  "choose-agent": AgentNetworkPreview,
  "run-workflow": WorkflowPreview,
  "build-test": BuildTestPreview,
  "review-ship": ReviewShipPreview,
};

export function PlaygroundPreview({ id }: { id: PlaygroundExperienceId }) {
  const Preview = PREVIEWS[id];
  return <Preview />;
}
