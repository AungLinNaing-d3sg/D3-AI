"use client";

import { phoneChatScript } from "@/data/home";
import { useDemo, type DemoFactory } from "./useDemo";

const CHIPS = [
  { className: "pc1", icon: "🎯", label: "Intent:", value: "order status" },
  { className: "pc2", icon: "✓", label: "Synced to", value: "Dynamics 365" },
];

function bubble(who: string, text: string) {
  const node = document.createElement("div");
  node.className = `msg ${who}`;
  node.textContent = text;
  return node;
}

function typingDots() {
  const node = document.createElement("div");
  node.className = "msg bot typing";
  node.append(document.createElement("i"), document.createElement("i"), document.createElement("i"));
  return node;
}

/**
 * Plays the scripted support conversation with typing indicators, then
 * clears and replays. Timers (not a GSAP timeline) because each beat appends
 * new nodes rather than tweening existing ones.
 */
const phoneChat: DemoFactory<HTMLDivElement> = (wrap) => {
  const staticBody = wrap.querySelector<HTMLElement>(".phone-body.is-static")!;
  const body = wrap.querySelector<HTMLElement>(".phone-body.is-live")!;
  const chips = Array.from(wrap.querySelectorAll<HTMLElement>(".phone-chip"));
  let timers: ReturnType<typeof setTimeout>[] = [];
  const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
  const add = (node: HTMLElement) => {
    body.append(node);
    while (body.children.length > 7) body.firstElementChild?.remove();
  };
  const reset = () => {
    body.textContent = "";
    body.classList.remove("is-clearing");
    chips.forEach((chip) => chip.classList.remove("show"));
  };

  const controls = {
    init() {
      staticBody.hidden = true;
      body.hidden = false;
      reset();
    },
    start() {
      controls.stop();
      reset();
      let t = 500;
      phoneChatScript.forEach((step) => {
        if (step.who === "bot") {
          let dots: HTMLElement | undefined;
          later(t, () => add((dots = typingDots())));
          t += 1300;
          later(t, () => {
            dots?.remove();
            add(bubble("bot", step.text));
          });
        } else {
          later(t, () => add(bubble("user", step.text)));
        }
        if ("chip" in step) later(t + 300, () => chips[step.chip]?.classList.add("show"));
        if ("card" in step) {
          const card = step.card;
          later(t + 700, () => {
            const node = document.createElement("div");
            node.className = "msg-card";
            node.textContent = `✓ ${card}`;
            add(node);
          });
        }
        t += 900 + step.text.length * 18;
      });
      later(t + 2600, () => body.classList.add("is-clearing"));
      later(t + 3100, () => controls.start());
    },
    stop() {
      timers.forEach(clearTimeout);
      timers = [];
    },
  };
  return controls;
};

export function PhoneChatDemo() {
  const ref = useDemo(phoneChat);
  return (
    <div className="phone-wrap" data-reveal ref={ref}>
      {CHIPS.map((chip) => (
        <div key={chip.className} className={`phone-chip ${chip.className} show`} aria-hidden="true">
          {chip.icon} {chip.label} <b>{chip.value}</b>
        </div>
      ))}
      <div className="phone" aria-hidden="true">
        <div className="phone-screen">
          <div className="phone-notch" />
          <div className="phone-status">
            <span>9:41</span>
            <span>5G ▮▮▮</span>
          </div>
          <div className="chat-head">
            <span className="avatar">D</span>
            <div>
              <b>Customer assistant</b>
              <small>AI · online</small>
            </div>
          </div>
          <div className="phone-body is-static">
            {phoneChatScript.map((step) => (
              <div key={step.text} className="contents">
                <div className={`msg ${step.who}`}>{step.text}</div>
                {"card" in step ? <div className="msg-card">✓ {step.card}</div> : null}
              </div>
            ))}
          </div>
          <div className="phone-body is-live" hidden />
          <div className="phone-input">
            <span>Message…</span>
            <i>➤</i>
          </div>
        </div>
      </div>
      <p className="phone-cap">Demo: an AI assistant answering customers in real time, wired into Dynamics 365.</p>
    </div>
  );
}
