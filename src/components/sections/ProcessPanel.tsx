"use client";

import type { CSSProperties, ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { SectionKicker } from "@/components/ui/SectionHeading";
import { processContent, processSteps } from "@/data/process";
import { useProcessSteps } from "./useProcessSteps";

const HEARTBEAT = "M0 25H60L68 25L76 8L84 42L92 25H150L158 25L166 12L174 38L182 25H240L248 25L256 6L264 44L272 25H300";
const UPTIME_DAYS = 30;
const DEGRADED_DAY = 17;

/** Illustrative mini-visual for each delivery step (sample content, from
 * development_v2). Each one plays in as its step lights up. */
const visuals: ReactNode[] = [
  <div className="process-viz viz-assess" aria-hidden="true" key="assess">
    {[
      ["Lead & opportunity tracking", "fit", "Fit"],
      ["Custom pricing rules", "gap", "Gap"],
      ["Email & calendar sync", "fit", "Fit"],
      ["Multi-level approvals", "fit", "Fit · Power Automate"],
    ].map(([need, kind, verdict], i) => (
      <div className="va-row" key={need} style={{ "--i": i } as CSSProperties}>
        <span>{need}</span>
        <b className={kind}>{verdict}</b>
      </div>
    ))}
  </div>,
  <div className="process-viz viz-plan" aria-hidden="true" key="plan">
    <div className="gantt">
      {(
        [
          ["Discover", 0, 24],
          ["Design", 18, 28],
          ["Build", 40, 42],
          ["Go-live", 80, 20],
        ] as const
      ).map(([phase, start, width], i) => (
        <div key={phase}>
          <span>{phase}</span>
          <span className="g-track">
            <i style={{ "--s": start, "--w": width, "--i": i } as CSSProperties} />
          </span>
        </div>
      ))}
      <em className="gantt-today" style={{ "--t": 46 } as CSSProperties} />
    </div>
  </div>,
  <div className="process-viz viz-build" aria-hidden="true" key="build">
    <div className="vb-top">
      <span>Sprint 4</span>
      <b>128/128 tests passed</b>
    </div>
    <div className="vb-bar">
      <i />
    </div>
    <ul className="vb-commits">
      <li style={{ "--i": 0 } as CSSProperties}>
        <code>a1f3c2</code>feat: sync orders to Dataverse
      </li>
      <li style={{ "--i": 1 } as CSSProperties}>
        <code>9c2e71</code>test: approval flow end-to-end
      </li>
      <li style={{ "--i": 2 } as CSSProperties}>
        <code>4b8d05</code>ci: deploy pipeline to Azure
      </li>
    </ul>
  </div>,
  <div className="process-viz viz-run" aria-hidden="true" key="run">
    <div className="vr-top">
      <span className="vr-live">All systems normal</span>
      <span>
        Response <b data-ms>182</b> ms
      </span>
    </div>
    <svg className="heartbeat" viewBox="0 0 300 50">
      <path className="hb-line" d={HEARTBEAT} pathLength={1} />
    </svg>
    <div className="uptime">
      {Array.from({ length: UPTIME_DAYS }, (_, day) => (
        <i key={day} className={day === DEGRADED_DAY ? "warn" : undefined} style={{ "--i": day } as CSSProperties} />
      ))}
    </div>
    <div className="vr-foot">
      <span>Last 30 days · sample</span>
      <span>Uptime checks</span>
    </div>
  </div>,
];

/**
 * Chapter 04's delivery process (Assess → Plan → Build → Run), ported from
 * the light redesign's Process section: a glass panel with a sticky
 * statement on the left and a railed list of steps on the right, each with
 * a small illustrative visual. The panel is translucent so chapter 04's
 * live network stays visible behind it. Phones swipe the steps sideways.
 */
export function ProcessPanel() {
  const panelRef = useProcessSteps();

  return (
    <div ref={panelRef} className="process-panel v2-glass">
      <span aria-hidden="true" className="v2-hud tl" />
      <span aria-hidden="true" className="v2-hud br" />
      <div className="process-grid">
        <div className="process-side">
          <SectionKicker label="How we deliver" />
          <Reveal as="h3" variant="maskLines" className="v2-heading process-title">
            {processContent.title} <span className="v2-accent">{processContent.titleHighlight}</span>
          </Reveal>
          <Reveal as="p" variant="blur" delay={0.1} className="v2-lead">
            {processContent.lead}
          </Reveal>
        </div>
        <ol className="process-steps" data-process-steps>
          <li className="process-rail" aria-hidden="true">
            <i data-process-rail />
          </li>
          {processSteps.map((step, i) => (
            <li className="process-step" data-process-step key={step.title}>
              <span className="process-numeral" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <Reveal as="h4" variant="blur" className="process-step-title">
                {step.title}
              </Reveal>
              <p>{step.text}</p>
              {visuals[i]}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
