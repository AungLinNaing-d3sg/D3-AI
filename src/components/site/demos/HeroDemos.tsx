"use client";

import { gsap } from "@/lib/motion/gsap";
import { hold, loop, money, useDemo, type DemoFactory } from "./useDemo";

/* ---------- Revenue forecast fed by a live data stream ---------- */

const POINTS = 12;
const STEP = 300 / (POINTS - 1);
const SEED = [30, 34, 31, 40, 38, 47, 45, 55, 52, 61, 66, 72];
const yOf = (v: number) => 112 - v;
/** Chart units → the revenue figure the tooltip shows (sample data). */
const revenue = (v: number) => 0.6 + v * 0.0089;
const growth = (series: number[]) =>
  (revenue(series[series.length - 1] ?? 0) / revenue(series[series.length - 7] ?? 1) - 1) * 100;

type Point = [number, number];

/** Catmull-Rom → cubic Bézier, so the line stays smooth as points stream in. */
export function smoothPath(points: Point[]) {
  const f = (n: number) => n.toFixed(1);
  const first = points[0];
  if (!first) return "";
  let d = `M${f(first[0])},${f(first[1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p0 = points[i - 1] ?? p1;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0]!)},${f(c1[1]!)} ${f(c2[0]!)},${f(c2[1]!)} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}

const seedPoints = SEED.map((v, i): Point => [i * STEP, yOf(v)]);
const SEED_LINE = smoothPath(seedPoints);
const SEED_AREA = `${SEED_LINE} L300,120 L0,120 Z`;
const SEED_LAST = SEED[SEED.length - 1] ?? 0;

const revenueStream: DemoFactory<HTMLDivElement> = (card) => {
  const line = card.querySelector<SVGPathElement>(".line")!;
  const area = card.querySelector<SVGPathElement>(".area")!;
  const dot = card.querySelector<HTMLElement>(".chart-dot")!;
  const tip = card.querySelector<HTMLElement>(".chart-tip")!;
  const kpi = card.querySelector<HTMLElement>(".kpi-val")!;
  let data = [...SEED];
  const shown = { v: growth(data) };

  const render = (series: number[], t: number) => {
    const points = series.map((v, i): Point => [(i - t) * STEP, yOf(v)]);
    const d = smoothPath(points);
    line.setAttribute("d", d);
    area.setAttribute("d", `${d} L${points[points.length - 1]![0].toFixed(1)},120 L${points[0]![0].toFixed(1)},120 Z`);
    const a = series[POINTS - 1] ?? 0;
    const b = series[POINTS] ?? a;
    const v = a + (b - a) * t;
    const top = `${(yOf(v) / 120) * 100}%`;
    dot.style.top = top;
    tip.style.top = top;
    tip.textContent = money(revenue(v));
  };

  return {
    ...loop(() => {
      let next = (data[POINTS - 1] ?? 50) + (Math.random() - 0.32) * 12;
      if (next > 94) next = 68 + Math.random() * 8;
      next = Math.max(20, next);
      const series = [...data, next];
      const progress = { t: 0 };
      return gsap
        .timeline({ delay: 1.1 })
        .to(progress, { t: 1, duration: 1, ease: "power2.inOut", onUpdate: () => render(series, progress.t) })
        .to(shown, { v: Math.max(growth(series.slice(1)), 1.2), duration: 1, ease: "power2.out", onUpdate: () => { kpi.textContent = shown.v.toFixed(1); } }, 0)
        .call(() => { data = series.slice(1); });
    }, 2.4),
    init() {
      render(data, 0);
      kpi.textContent = shown.v.toFixed(1);
      gsap.delayedCall(0.6, () => card.classList.add("is-drawn"));
    },
  };
};

export function RevenueStreamCard() {
  const ref = useDemo(revenueStream);
  return (
    <div className="card" id="hero-chart" ref={ref}>
      <div className="card-head">
        <span>Revenue forecast · sample data</span>
        <span className="live">Live</span>
      </div>
      <div className="big">
        +<span className="kpi-val">{growth(SEED).toFixed(1)}</span>%<small>vs 6 months ago</small>
      </div>
      <div className="chart-wrap">
        <svg className="chart" viewBox="0 0 300 120" aria-hidden="true">
          <defs>
            <linearGradient id="hero-area-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#e5412d" stopOpacity="0.22" />
              <stop offset="1" stopColor="#e5412d" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="grid" d="M0 30H300M0 60H300M0 90H300" />
          <path className="area" fill="url(#hero-area-fill)" d={SEED_AREA} />
          <path className="line" pathLength={1} d={SEED_LINE} />
        </svg>
        <span className="chart-dot" style={{ top: `${(yOf(SEED_LAST) / 120) * 100}%` }} />
        <span className="chart-tip" style={{ top: `${(yOf(SEED_LAST) / 120) * 100}%` }}>
          {money(revenue(SEED_LAST))}
        </span>
      </div>
    </div>
  );
}

/* ---------- Power Automate approval run ---------- */

const APPROVAL_STEPS = [
  { label: "Order received", time: "09:41:02" },
  { label: "Manager approved", time: "09:41:04" },
  { label: "Dynamics 365 updated", time: "09:41:05" },
  { label: "Customer notified", time: "09:41:05" },
];

const approvalFlow: DemoFactory<HTMLDivElement> = (card) => {
  const rows = Array.from(card.querySelectorAll<HTMLLIElement>("li"));
  const state = card.querySelector<HTMLElement>(".run-state")!;
  const setState = (text: string, cls: string) => {
    state.textContent = text;
    state.className = `run-state ${cls}`.trim();
  };
  const stamp = () => new Date().toTimeString().slice(0, 8);

  return loop(
    () => {
      const tl = gsap.timeline();
      let startedAt = 0;
      tl.call(() => {
        rows.forEach((row) => { row.className = ""; });
        setState("Waiting for trigger", "");
      });
      hold(tl, 1);
      rows.forEach((row, i) => {
        tl.call(() => {
          if (i === 0) startedAt = Date.now();
          row.className = "run";
          setState("Running", "is-run");
        });
        hold(tl, i === 1 ? 1.5 : 0.75); // the human approval takes longest
        tl.call(() => {
          row.className = "done";
          const time = row.querySelector("time");
          if (time) time.textContent = stamp();
        });
      });
      tl.call(() => setState(`Succeeded · ${((Date.now() - startedAt) / 1000).toFixed(1)}s`, "is-ok"));
      return hold(tl, 3.2);
    },
    1,
    2
  );
};

export function ApprovalFlowCard() {
  const ref = useDemo(approvalFlow);
  return (
    <div className="card" ref={ref}>
      <div className="card-head">
        <span>Approval flow</span>
        <span className="run-state is-ok">Succeeded</span>
      </div>
      <ol className="flow-run">
        {APPROVAL_STEPS.map((step) => (
          <li key={step.label} className="done">
            <i aria-hidden="true" />
            <span>{step.label}</span>
            <time>{step.time}</time>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------- Model training until it is good enough to deploy ---------- */

const modelTraining: DemoFactory<HTMLDivElement> = (card) => {
  const fill = card.querySelector<SVGCircleElement>(".fill")!;
  const accuracy = card.querySelector<HTMLElement>(".acc")!;
  const label = card.querySelector<HTMLElement>(".train-label")!;
  const set = (value: number) => {
    fill.style.strokeDashoffset = String(100 - value);
    accuracy.textContent = `${Math.round(value)}%`;
  };

  return {
    ...loop(
      () => {
        const epoch = { e: 0 };
        return gsap
          .timeline()
          .call(() => { set(58); label.textContent = "Training · epoch 0/20"; })
          .to(epoch, {
            e: 20,
            duration: 4.6,
            ease: "none",
            onUpdate: () => {
              const e = epoch.e;
              const noise = Math.sin(e * 2.7) * (1 - e / 20) * 2;
              set(Math.min(96, 58 + 38 * (1 - Math.pow(1 - e / 20, 2.2)) + noise));
              label.textContent = `Training · epoch ${Math.ceil(e)}/20`;
            },
          })
          .call(() => { set(96); label.textContent = "Deployed ✓"; })
          .to({}, { duration: 3.4 });
      },
      1.4,
      2
    ),
    init() {
      fill.style.transition = "none";
    },
  };
};

export function ModelTrainingCard() {
  const ref = useDemo(modelTraining);
  return (
    <div className="card ring" ref={ref}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle className="track" cx="32" cy="32" r="26" />
        <circle className="fill" cx="32" cy="32" r="26" pathLength={100} />
      </svg>
      <div>
        <b className="acc">96%</b>
        <span className="train-label">Model accuracy</span>
      </div>
    </div>
  );
}
