import type { CSSProperties, ReactNode } from "react";
import { processSteps } from "@/data/home";

const HEARTBEAT = "M0 25H60L68 25L76 8L84 42L92 25H150L158 25L166 12L174 38L182 25H240L248 25L256 6L264 44L272 25H300";
const UPTIME_DAYS = 30;
const DEGRADED_DAY = 17;

/** Illustrative mini-visual for each delivery step (sample content). Static;
 * the step itself highlights as it scrolls into focus. */
const visuals: ReactNode[] = [
  <div className="viz viz-assess" aria-hidden="true" key="assess">
    {[
      ["Lead & opportunity tracking", "fit", "Fit"],
      ["Custom pricing rules", "gap", "Gap"],
      ["Email & calendar sync", "fit", "Fit"],
      ["Multi-level approvals", "fit", "Fit · Power Automate"],
    ].map(([need, kind, verdict]) => (
      <div className="va-row" key={need}>
        <span>{need}</span>
        <b className={kind}>{verdict}</b>
      </div>
    ))}
  </div>,
  <div className="viz viz-plan" aria-hidden="true" key="plan">
    <div className="gantt">
      {[
        ["Discover", 0, 24],
        ["Design", 18, 28],
        ["Build", 40, 42],
        ["Go-live", 80, 20],
      ].map(([phase, start, width]) => (
        <div key={phase}>
          <span>{phase}</span>
          <span className="g-track">
            <i style={{ "--s": start, "--w": width } as CSSProperties} />
          </span>
        </div>
      ))}
      <em className="today" style={{ "--t": 46 } as CSSProperties} />
    </div>
  </div>,
  <div className="viz viz-build" aria-hidden="true" key="build">
    <div className="vb-top">
      <span>Sprint 4</span>
      <b>
        <span data-tests="128">128</span>/128 tests passed
      </b>
    </div>
    <div className="vb-bar">
      <i />
    </div>
    <ul className="vb-commits">
      <li>
        <code>a1f3c2</code>feat: sync orders to Dataverse
      </li>
      <li>
        <code>9c2e71</code>test: approval flow end-to-end
      </li>
      <li>
        <code>4b8d05</code>ci: deploy pipeline to Azure
      </li>
    </ul>
  </div>,
  <div className="viz viz-run" aria-hidden="true" key="run">
    <div className="vr-top">
      <span className="live">All systems normal</span>
      <span>
        Response <b data-ms>182</b> ms
      </span>
    </div>
    <svg className="heartbeat" viewBox="0 0 300 50">
      <path className="hb-line" d={HEARTBEAT} />
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

export function Process() {
  return (
    <section id="process" aria-labelledby="process-title">
      <div className="process-panel" data-process-panel>
      <div className="process-grid">
        <div className="process-side">
          <h2 id="process-title" data-anim="random-chars">
            From first assessment to <span className="accent">managed operation.</span>
          </h2>
          <p className="lead" data-reveal>
            A team with real-world project experience and industrial know-how, with you at every step.
          </p>
        </div>
        <ol className="steps">
          <li className="rail" aria-hidden="true">
            <i />
          </li>
          {processSteps.map((step, i) => (
            <li className="step" key={step.title}>
              <span className="numeral" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 data-anim="blur-in">{step.title}</h3>
              <p>{step.text}</p>
              {visuals[i]}
            </li>
          ))}
        </ol>
      </div>
      </div>
    </section>
  );
}
