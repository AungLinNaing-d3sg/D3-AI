"use client";

import type { CSSProperties } from "react";
import { gsap } from "@/lib/motion/gsap";
import { click, fakeCursor, hold, loop, money, relPos, useDemo, type DemoFactory } from "./useDemo";

/* ---------- Data: an analyst clicking through a BI report ---------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
const REPORTS = [
  { tab: "2024", heights: [32, 40, 36, 48, 44, 52, 50, 58], total: 1.08, label: "Revenue 2024", forecast: 0 },
  { tab: "2025", heights: [42, 50, 47, 60, 56, 66, 70, 78], total: 1.24, label: "Revenue 2025", forecast: 0 },
  { tab: "Forecast", heights: [42, 50, 47, 60, 56, 72, 80, 90], total: 1.41, label: "Projected 2025", forecast: 3 },
];
const DEFAULT_REPORT = 1;

const biDashboard: DemoFactory<HTMLDivElement> = (box) => {
  const tabs = Array.from(box.querySelectorAll<HTMLElement>(".dash-tabs span"));
  const bars = Array.from(box.querySelectorAll<HTMLElement>(".dash-bars i"));
  const tip = box.querySelector<HTMLElement>(".dash-tip")!;
  const kpi = box.querySelector<HTMLElement>(".dash-kpi b")!;
  const kpiLabel = box.querySelector<HTMLElement>(".dash-kpi small")!;
  const shown = { v: REPORTS[DEFAULT_REPORT]!.total };

  const apply = (index: number) => {
    const report = REPORTS[index]!;
    tabs.forEach((tab, i) => tab.classList.toggle("on", i === index));
    bars.forEach((bar, i) => {
      bar.style.setProperty("--h", `${report.heights[i]}%`);
      bar.classList.toggle("fc", i >= bars.length - report.forecast);
    });
    kpiLabel.textContent = report.label;
    gsap.to(shown, { v: report.total, duration: 0.8, ease: "power2.out", onUpdate: () => { kpi.textContent = money(shown.v); } });
  };

  let cursor: HTMLElement | undefined;
  return loop(() => {
    cursor ??= fakeCursor(box);
    const c = cursor;
    const tl = gsap.timeline();
    const moveTo = (target: HTMLElement, duration = 0.9) =>
      tl.to(c, { x: () => relPos(target, box).x, y: () => relPos(target, box).y, duration, ease: "power2.inOut" });
    [2, 0, 1].forEach((index) => {
      moveTo(tabs[index]!);
      click(tl, c);
      tl.call(() => apply(index));
      if (index === 2) {
        hold(tl, 0.6);
        moveTo(bars[bars.length - 1]!, 0.8);
        tl.call(() => tip.classList.add("show"));
        hold(tl, 1.8);
        tl.call(() => tip.classList.remove("show"));
      } else {
        hold(tl, 1.9);
      }
    });
    return tl;
  }, 0.5);
};

export function BiDashboardDemo() {
  const ref = useDemo(biDashboard);
  const report = REPORTS[DEFAULT_REPORT]!;
  return (
    <div className="dash" ref={ref} aria-hidden="true">
      <div className="dash-top">
        <div className="dash-tabs">
          {REPORTS.map((r, i) => (
            <span key={r.tab} className={i === DEFAULT_REPORT ? "on" : undefined}>
              {r.tab}
            </span>
          ))}
        </div>
        <div className="dash-kpi">
          <small>{report.label}</small>
          <b>{money(report.total)}</b>
        </div>
      </div>
      <div className="dash-bars">
        {report.heights.map((h, i) => (
          <i key={MONTHS[i]} style={{ "--h": `${h}%` } as CSSProperties} />
        ))}
      </div>
      <div className="dash-axis">
        {MONTHS.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <span className="dash-tip">Aug · $186k forecast</span>
    </div>
  );
}

/* ---------- Dynamics: a deal dragged through the sales pipeline ---------- */

const COLUMNS = [
  { name: "Lead", deals: [{ name: "Fabrikam", value: "$32k" }, { name: "Northwind", value: "$18k" }] },
  { name: "Qualified", deals: [{ name: "Adventure Works", value: "$56k" }] },
  { name: "Won", deals: [{ name: "Tailspin", value: "$24k" }] },
];
const WON = COLUMNS.length - 1;

const pipelineBoard: DemoFactory<HTMLDivElement> = (box) => {
  const slots = Array.from(box.querySelectorAll<HTMLElement>(".kb-slot"));
  const counts = Array.from(box.querySelectorAll<HTMLElement>(".kb-col h4 b"));
  const live = box.querySelector<HTMLElement>(".deal-live")!;
  const stage = live.querySelector<HTMLElement>(".deal-stage")!;
  const toast = box.querySelector<HTMLElement>(".kb-toast")!;

  const setColumn = (col: number) => {
    counts.forEach((count, i) => { count.textContent = String(COLUMNS[i]!.deals.length + (i === col ? 1 : 0)); });
    stage.textContent = COLUMNS[col]!.name;
    live.dataset.stage = String(col);
  };
  const slotAt = (col: number) => relPos(slots[col]!, box, false);

  let cursor: HTMLElement | undefined;
  return {
    ...loop(() => {
      cursor ??= fakeCursor(box);
      const c = cursor;
      const tl = gsap.timeline();
      const toSlot = (col: number, axis: "x" | "y") => () => relPos(slots[col]!, box)[axis];
      tl.call(() => {
        gsap.set(live, { ...slotAt(0), width: slots[0]!.offsetWidth });
        setColumn(0);
        toast.classList.remove("show");
      })
        .to(live, { opacity: 1, duration: 0.4 })
        .to(c, { x: toSlot(0, "x"), y: toSlot(0, "y"), duration: 0.9, ease: "power2.inOut" });
      [1, 2].forEach((col) => {
        tl.to(c, { scale: 0.85, duration: 0.1 })
          .call(() => { live.classList.add("is-lifted"); box.classList.add("is-dragging"); })
          .to(live, { x: () => slotAt(col).x, y: () => slotAt(col).y, duration: 1, ease: "power2.inOut" })
          .to(c, { x: toSlot(col, "x"), y: toSlot(col, "y"), duration: 1, ease: "power2.inOut" }, "<")
          .call(() => { live.classList.remove("is-lifted"); box.classList.remove("is-dragging"); setColumn(col); })
          .to(c, { scale: 1, duration: 0.15 });
        hold(tl, 0.7);
      });
      tl.call(() => toast.classList.add("show")).to(c, {
        x: box.offsetWidth * 0.82,
        y: box.offsetHeight * 0.55,
        duration: 0.8,
        ease: "power2.inOut",
      });
      hold(tl, 2.4);
      return tl.call(() => toast.classList.remove("show")).to(live, { opacity: 0, duration: 0.4 }, "+=0.3");
    }, 0.4),
    renderStatic() {
      const { x, y } = slotAt(WON);
      live.style.transform = `translate(${x}px, ${y}px)`;
      live.style.width = `${slots[WON]!.offsetWidth}px`;
      setColumn(WON);
    },
  };
};

export function PipelineBoardDemo() {
  const ref = useDemo(pipelineBoard);
  return (
    <div className="kanban" ref={ref} aria-hidden="true">
      {COLUMNS.map((col, i) => (
        <div className="kb-col" key={col.name}>
          <h4>
            {col.name} <b>{col.deals.length + (i === WON ? 1 : 0)}</b>
          </h4>
          <div className="kb-slot" />
          {col.deals.map((deal) => (
            <div className="deal" key={deal.name}>
              {deal.name}
              <small>{deal.value}</small>
            </div>
          ))}
        </div>
      ))}
      <div className="deal deal-live" data-stage={WON}>
        Contoso Ltd
        <small>
          <span>$120k</span>
          <span className="deal-stage">Won</span>
        </small>
      </div>
      <div className="kb-toast show">⚡ Power Automate sent the contract to Contoso</div>
    </div>
  );
}

/* ---------- Digital: code builds the app, then CI/CD ships it ---------- */

type Token = readonly [cls: "p" | "k" | "f" | "s", text: string];

/** Each line of code reveals one part of the live preview (by index). */
const CODE_LINES: ReadonlyArray<readonly Token[]> = [
  [["p", "<"], ["f", "Header"], ["k", " title"], ["p", "="], ["s", '"Orders"'], ["p", " />"]],
  [["p", "<"], ["f", "SalesChart"], ["k", " data"], ["p", "={sales} />"]],
  [["p", "<"], ["f", "OrderList"], ["k", " top"], ["p", "={"], ["s", "3"], ["p", "} />"]],
  [["p", "<"], ["f", "Button"], ["p", ">Approve all</"], ["f", "Button"], ["p", ">"]],
];
const PIPELINE = ["Build", "Tests", "Deploy"];
const TEST_COUNT = 24;

const codeToApp: DemoFactory<HTMLDivElement> = (box) => {
  const staticCode = box.querySelector<HTMLElement>(".code-static")!;
  const liveCode = box.querySelector<HTMLElement>(".code-live")!;
  const parts = Array.from(box.querySelectorAll<HTMLElement>(".pv-el"));
  const steps = Array.from(box.querySelectorAll<HTMLElement>(".ps"));
  const tests = box.querySelector<HTMLElement>(".ps em")!;
  const status = box.querySelector<HTMLElement>(".pipe-status")!;

  const chars: { cls: string; ch: string; reveals?: number }[] = [];
  CODE_LINES.forEach((line, li) => {
    line.forEach(([cls, text]) => [...text].forEach((ch) => chars.push({ cls, ch })));
    chars[chars.length - 1]!.reveals = li;
    if (li < CODE_LINES.length - 1) chars.push({ cls: "p", ch: "\n" });
  });
  const caret = document.createElement("span");
  caret.className = "caret";
  const render = (count: number) => {
    liveCode.textContent = "";
    let span: HTMLSpanElement | null = null;
    let current = "";
    for (let i = 0; i < count; i++) {
      const { cls, ch } = chars[i]!;
      if (!span || cls !== current) {
        span = document.createElement("span");
        span.className = cls;
        liveCode.append(span);
        current = cls;
      }
      span.textContent += ch;
    }
    liveCode.append(caret);
  };

  return {
    ...loop(() => {
      const tl = gsap.timeline();
      tl.call(() => {
        render(0);
        parts.forEach((p) => p.classList.add("is-hidden"));
        steps.forEach((s) => { s.className = "ps is-pending"; });
        tests.textContent = `0/${TEST_COUNT}`;
        status.classList.add("is-hidden");
      });
      hold(tl, 0.5);
      chars.forEach((c, i) => {
        tl.call(() => {
          render(i + 1);
          if (c.reveals !== undefined) parts[c.reveals]?.classList.remove("is-hidden");
        });
        hold(tl, c.ch === "\n" ? 0.3 : 0.025 + Math.random() * 0.035);
      });
      hold(tl, 0.5);
      steps.forEach((step, i) => {
        tl.call(() => { step.className = "ps is-run"; });
        if (i === 1) {
          const run = { n: 0 };
          tl.to(run, { n: TEST_COUNT, duration: 1.2, ease: "none", onUpdate: () => { tests.textContent = `${Math.round(run.n)}/${TEST_COUNT}`; } });
        } else {
          hold(tl, 0.9);
        }
        tl.call(() => { step.className = "ps"; });
      });
      tl.call(() => status.classList.remove("is-hidden"));
      return hold(tl, 3.2);
    }, 0.4),
    init() {
      staticCode.hidden = true;
      liveCode.hidden = false;
    },
  };
};

export function CodeToAppDemo() {
  const ref = useDemo(codeToApp);
  return (
    <div className="dev" ref={ref} aria-hidden="true">
      <div className="code">
        <div className="code-bar">
          <i />
          <i />
          <i />
          <span className="fname">Orders.tsx</span>
        </div>
        <pre className="code-static">
          {CODE_LINES.map((line, li) => (
            <span key={li}>
              {line.map(([cls, text], ti) => (
                <span key={ti} className={cls}>
                  {text}
                </span>
              ))}
              {li < CODE_LINES.length - 1 ? "\n" : null}
            </span>
          ))}
        </pre>
        <pre className="code-live" hidden />
      </div>
      <div className="pv">
        <div className="pv-screen">
          <div className="pv-el pv-head">
            Orders
            <span />
          </div>
          <div className="pv-el pv-chart">
            {[40, 62, 48, 75, 66, 92].map((h) => (
              <i key={h} style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="pv-el pv-list">
            <div>
              #4821 Contoso<b>$1.2k</b>
            </div>
            <div>
              #4822 Fabrikam<b>$860</b>
            </div>
            <div>
              #4823 Northwind<b>$2.4k</b>
            </div>
          </div>
          <div className="pv-el pv-btn">Approve all</div>
        </div>
      </div>
      <div className="pipe">
        {PIPELINE.map((name) => (
          <span className="ps" key={name}>
            {name}
            {name === "Tests" ? (
              <em>
                {TEST_COUNT}/{TEST_COUNT}
              </em>
            ) : null}
          </span>
        ))}
        <span className="pipe-status">✓ Live on Azure</span>
      </div>
    </div>
  );
}
