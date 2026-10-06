"use client";

import { gsap } from "@/lib/motion/gsap";
import { click, fakeCursor, hold, loop, relPos, useDemo, type DemoFactory } from "./useDemo";

/**
 * Digital: a VS Code window where the JSX of an Orders screen is typed out;
 * each finished line builds that part of the app on an iPhone beside it.
 * CI/CD then builds, tests and deploys, and a tap on "Approve all"
 * approves the orders live. Sample data only.
 */

type Cls = "k" | "f" | "a" | "s" | "p" | "v" | "c";
type Token = readonly [Cls, string];
interface Line {
  tokens: readonly Token[];
  /** Typed live (the JSX); the rest of the file is already there. */
  typed?: boolean;
  /** Index of the phone UI part this line reveals once finished. */
  reveals?: number;
}

const ind = (n: number): Token => ["p", " ".repeat(n)];

const FILE: readonly Line[] = [
  { tokens: [["k", "import"], ["p", " { "], ["v", "Screen"], ["p", ", "], ["v", "OrderList"], ["p", " } "], ["k", "from"], ["p", " "], ["s", '"@/ui"'], ["p", ";"]] },
  { tokens: [["k", "import"], ["p", " { "], ["f", "useOrders"], ["p", " } "], ["k", "from"], ["p", " "], ["s", '"./api"'], ["p", ";"]] },
  { tokens: [] },
  { tokens: [["k", "export default function"], ["p", " "], ["f", "Orders"], ["p", "() {"]] },
  { tokens: [ind(2), ["k", "const"], ["p", " { "], ["v", "orders"], ["p", ", "], ["v", "stats"], ["p", " } = "], ["f", "useOrders"], ["p", "();"]] },
  { tokens: [ind(2), ["k", "return"], ["p", " ("]] },
  { typed: true, reveals: 0, tokens: [ind(4), ["p", "<"], ["f", "Screen"], ["p", " "], ["a", "title"], ["p", "="], ["s", '"Orders"'], ["p", ">"]] },
  { typed: true, reveals: 1, tokens: [ind(6), ["p", "<"], ["f", "RevenueCard"], ["p", " "], ["a", "value"], ["p", "={"], ["v", "stats"], ["p", "."], ["v", "today"], ["p", "} />"]] },
  { typed: true, reveals: 2, tokens: [ind(6), ["p", "<"], ["f", "Segmented"], ["p", " "], ["a", "options"], ["p", "={"], ["v", "filters"], ["p", "} />"]] },
  { typed: true, reveals: 3, tokens: [ind(6), ["p", "<"], ["f", "OrderList"], ["p", " "], ["a", "items"], ["p", "={"], ["v", "orders"], ["p", "} />"]] },
  { typed: true, tokens: [ind(6), ["p", "<"], ["f", "Button"], ["p", " "], ["a", "onPress"], ["p", "={"], ["f", "approveAll"], ["p", "}>"]] },
  { typed: true, tokens: [ind(8), ["p", "Approve all"]] },
  { typed: true, reveals: 4, tokens: [ind(6), ["p", "</"], ["f", "Button"], ["p", ">"]] },
  { typed: true, tokens: [ind(4), ["p", "</"], ["f", "Screen"], ["p", ">"]] },
  { tokens: [ind(2), ["p", ");"]] },
  { tokens: [["p", "}"]] },
];

const ORDERS = [
  { initials: "CL", name: "Contoso Ltd", id: "#4821", amount: "$1,240" },
  { initials: "FB", name: "Fabrikam", id: "#4822", amount: "$860" },
  { initials: "NW", name: "Northwind", id: "#4823", amount: "$2,410" },
];
const PIPELINE = ["Build", "Tests", "Deploy"];
const TEST_COUNT = 24;
const SPARK = "M0 22 C8 20 14 14 22 15 S36 8 44 9 S58 4 66 2";

/** Characters of the file in order, each tagged with its line. */
function flatten() {
  const chars: { cls: Cls; ch: string; line: number; typed: boolean; reveals?: number }[] = [];
  FILE.forEach((line, li) => {
    const typed = !!line.typed;
    line.tokens.forEach(([cls, text]) => [...text].forEach((ch) => chars.push({ cls, ch, line: li, typed })));
    if (line.reveals !== undefined && chars.length) chars[chars.length - 1]!.reveals = line.reveals;
    if (li < FILE.length - 1) chars.push({ cls: "p", ch: "\n", line: li, typed });
  });
  return chars;
}

const codeToApp: DemoFactory<HTMLDivElement> = (box) => {
  const staticCode = box.querySelector<HTMLElement>(".code-static")!;
  const liveCode = box.querySelector<HTMLElement>(".code-live")!;
  const codeArea = box.querySelector<HTMLElement>(".vsc-code")!;
  const cursorPos = box.querySelector<HTMLElement>(".vsc-pos")!;
  const dirty = box.querySelector<HTMLElement>(".vsc-tab.on")!;
  const parts = Array.from(box.querySelectorAll<HTMLElement>(".ip-part"));
  const pills = Array.from(box.querySelectorAll<HTMLElement>(".ip-pill"));
  const button = box.querySelector<HTMLElement>(".ip-btn")!;
  const toast = box.querySelector<HTMLElement>(".ip-toast")!;
  const steps = Array.from(box.querySelectorAll<HTMLElement>(".ps"));
  const tests = box.querySelector<HTMLElement>(".ps em")!;
  const status = box.querySelector<HTMLElement>(".pipe-status")!;
  const branch = box.querySelector<HTMLElement>(".vsc-sync")!;

  const chars = flatten();
  const firstTyped = chars.findIndex((c) => c.typed);
  const lastTyped = chars.length - 1 - [...chars].reverse().findIndex((c) => c.typed);
  const caret = document.createElement("span");
  caret.className = "caret";

  // Render the static head, `n` typed characters, then the static tail,
  // with the caret after the last typed character.
  const render = (n: number) => {
    liveCode.textContent = "";
    let span: HTMLSpanElement | null = null;
    let current = "";
    const caretAfter = firstTyped + n - 1;
    chars.forEach((c, i) => {
      if (c.typed && i > caretAfter) return;
      if (!span || c.cls !== current) {
        span = document.createElement("span");
        span.className = c.cls;
        liveCode.append(span);
        current = c.cls;
      }
      span.textContent += c.ch;
      if (i === caretAfter) {
        liveCode.append(caret);
        span = null;
      }
    });
    const at = chars[caretAfter];
    const line = at ? (at.ch === "\n" ? at.line + 1 : at.line) : 0;
    const col = at && at.ch !== "\n" ? chars.slice(0, caretAfter + 1).filter((x) => x.line === at.line && x.ch !== "\n").length + 1 : 1;
    codeArea.style.setProperty("--ln", String(line));
    cursorPos.textContent = `Ln ${line + 1}, Col ${col}`;
  };

  const setPills = (approved: boolean) =>
    pills.forEach((pill) => {
      pill.textContent = approved ? "Approved" : "Pending";
      pill.classList.toggle("is-ok", approved);
    });

  let cursor: HTMLElement | undefined;
  return {
    ...loop(
      () => {
        const tl = gsap.timeline();
        tl.call(() => {
          render(0);
          dirty.classList.add("is-dirty");
          parts.forEach((p) => p.classList.add("is-hidden"));
          setPills(false);
          toast.classList.remove("show");
          steps.forEach((s) => { s.className = "ps is-pending"; });
          tests.textContent = `0/${TEST_COUNT}`;
          status.classList.add("is-hidden");
          branch.textContent = "⟳ main*";
        });
        hold(tl, 0.6);
        for (let n = 1; n <= lastTyped - firstTyped + 1; n++) {
          const c = chars[firstTyped + n - 1]!;
          tl.call(() => {
            render(n);
            if (c.reveals !== undefined) parts[c.reveals]?.classList.remove("is-hidden");
          });
          hold(tl, c.ch === "\n" ? 0.22 : c.ch === " " ? 0.008 : 0.018 + Math.random() * 0.025);
        }
        tl.call(() => { dirty.classList.remove("is-dirty"); branch.textContent = "✓ main"; });
        hold(tl, 0.4);
        steps.forEach((step, i) => {
          tl.call(() => { step.className = "ps is-run"; });
          if (i === 1) {
            const run = { n: 0 };
            tl.to(run, { n: TEST_COUNT, duration: 1.1, ease: "none", onUpdate: () => { tests.textContent = `${Math.round(run.n)}/${TEST_COUNT}`; } });
          } else hold(tl, 0.8);
          tl.call(() => { step.className = "ps"; });
        });
        tl.call(() => status.classList.remove("is-hidden"));
        hold(tl, 0.5);
        // A user taps "Approve all" in the shipped app.
        if (!cursor) {
          cursor = fakeCursor(box);
          gsap.set(cursor, { opacity: 0 });
        }
        const c = cursor;
        tl.set(c, { x: () => box.offsetWidth * 0.92, y: () => box.offsetHeight * 0.96, opacity: 1 })
          .to(c, { x: () => relPos(button, box).x, y: () => relPos(button, box).y, duration: 0.9, ease: "power2.inOut" });
        click(tl, c);
        tl.call(() => button.classList.add("is-pressed"));
        hold(tl, 0.18);
        tl.call(() => button.classList.remove("is-pressed"));
        pills.forEach((pill) => {
          tl.call(() => {
            pill.textContent = "Approved";
            pill.classList.add("is-ok");
          });
          hold(tl, 0.22);
        });
        tl.call(() => toast.classList.add("show"));
        tl.to(c, { opacity: 0, duration: 0.4 }, "+=0.4");
        hold(tl, 2.6);
        return tl;
      },
      0.4,
      2
    ),
    init() {
      staticCode.hidden = true;
      liveCode.hidden = false;
      render(0);
    },
  };
};

function Glyph({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function CodeToAppDemo() {
  const ref = useDemo(codeToApp);
  return (
    <div className="dev" ref={ref} aria-hidden="true">
      {/* ---------- VS Code ---------- */}
      <div className="vsc">
        <div className="vsc-title">
          <span className="vsc-lights">
            <i />
            <i />
            <i />
          </span>
          <span className="vsc-search">orders-app</span>
        </div>
        <div className="vsc-main">
          <div className="vsc-activity">
            <Glyph d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z M14 3v5h5" />
            <Glyph d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4" />
            <Glyph d="M6 3v12 M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 9a9 9 0 0 1-9 9" />
            <Glyph d="M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M15 15h5v5h-5z" />
          </div>
          <div className="vsc-editor">
            <div className="vsc-tabs">
              <span className="vsc-tab on">
                <b className="tsx">⚛</b> Orders.tsx
              </span>
              <span className="vsc-tab">
                <b className="ts">TS</b> api.ts
              </span>
            </div>
            <div className="vsc-crumbs">src › app › Orders.tsx › Orders</div>
            <div className="vsc-code">
              <span className="vsc-line-hl" />
              <ol className="vsc-gutter">
                {FILE.map((_, i) => (
                  <li key={i}>{i + 1}</li>
                ))}
              </ol>
              <pre className="code-static">
                {FILE.map((line, li) => (
                  <span key={li}>
                    {line.tokens.map(([cls, text], ti) => (
                      <span key={ti} className={cls}>
                        {text}
                      </span>
                    ))}
                    {li < FILE.length - 1 ? "\n" : null}
                  </span>
                ))}
              </pre>
              <pre className="code-live" hidden />
              <div className="vsc-minimap">
                {FILE.map((line, i) => (
                  <i key={i} style={{ width: `${Math.min(100, line.tokens.reduce((n, [, t]) => n + t.length, 0) * 2.2)}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="vsc-status">
          <span className="vsc-sync">✓ main</span>
          <span>⊘ 0 ⚠ 0</span>
          <span className="vsc-spacer" />
          <span className="vsc-pos">Ln 16, Col 2</span>
          <span>TypeScript JSX</span>
        </div>
      </div>

      {/* ---------- iPhone ---------- */}
      <div className="iphone">
        <span className="ip-btn-side l1" />
        <span className="ip-btn-side l2" />
        <span className="ip-btn-side r1" />
        <div className="ip-screen">
          <div className="ip-island" />
          <div className="ip-status">
            <b>9:41</b>
            <span>
              <svg viewBox="0 0 18 12">
                <path d="M1 11h2V8H1zM5 11h2V6H5zM9 11h2V4H9zM13 11h2V1h-2z" />
              </svg>
              <svg viewBox="0 0 16 12">
                <path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0zM3.5 7a6.4 6.4 0 0 1 9 0l-1.3 1.3a4.6 4.6 0 0 0-6.4 0zM1 4.5a10 10 0 0 1 14 0l-1.3 1.3a8.2 8.2 0 0 0-11.4 0z" />
              </svg>
              <i className="ip-battery" />
            </span>
          </div>
          <div className="ip-part ip-nav">
            <b>Orders</b>
            <span className="ip-avatar">MY</span>
          </div>
          <div className="ip-part ip-kpi">
            <div>
              <small>Today</small>
              <b>$12,480</b>
              <em>▲ 8.2%</em>
            </div>
            <svg viewBox="0 0 66 24">
              <path className="ip-spark" d={SPARK} />
            </svg>
          </div>
          <div className="ip-part ip-seg">
            <span className="on">All</span>
            <span>Pending</span>
            <span>Done</span>
          </div>
          <ul className="ip-part ip-list">
            {ORDERS.map((o) => (
              <li key={o.id}>
                <span className="ip-av">{o.initials}</span>
                <span className="ip-who">
                  <b>{o.name}</b>
                  <small>
                    {o.id} · {o.amount}
                  </small>
                </span>
                <span className="ip-pill is-ok">Approved</span>
              </li>
            ))}
          </ul>
          <div className="ip-part ip-btn">Approve all</div>
          <div className="ip-toast">✓ 3 orders approved</div>
          <div className="ip-tabbar">
            <i className="on" />
            <i />
            <i />
            <i />
          </div>
          <span className="ip-home" />
        </div>
      </div>

      {/* ---------- CI/CD ---------- */}
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
