"use client";

import { useRef, type MouseEvent } from "react";
import { faqItems } from "@/data/home";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ChatOpenButton } from "./ChatWidget";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * Native `<details>` disclosure (keyboard + screen-reader support for free),
 * with the open/close height animated via the Web Animations API when motion
 * is allowed. Under reduced motion the default toggle is left alone.
 */
function FaqItem({ q, a }: { q: string; a: string }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const animating = useRef<Animation | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  function toggle(event: MouseEvent<HTMLElement>) {
    const details = detailsRef.current;
    const answer = answerRef.current;
    if (reducedMotion || !details || !answer || typeof answer.animate !== "function") return;
    event.preventDefault();
    if (animating.current) return;

    const options = { duration: 450, easing: EASE };
    if (details.open) {
      details.classList.add("is-closing");
      const anim = answer.animate([{ height: `${answer.offsetHeight}px`, opacity: 1 }, { height: "0px", opacity: 0 }], options);
      animating.current = anim;
      anim.onfinish = () => {
        details.open = false;
        details.classList.remove("is-closing");
        animating.current = null;
      };
    } else {
      details.open = true;
      const anim = answer.animate([{ height: "0px", opacity: 0 }, { height: `${answer.offsetHeight}px`, opacity: 1 }], options);
      animating.current = anim;
      anim.onfinish = () => {
        animating.current = null;
      };
    }
  }

  return (
    <details ref={detailsRef}>
      <summary onClick={toggle}>
        {q}
        <i aria-hidden="true" />
      </summary>
      <div className="faq-a" ref={answerRef}>
        <p>{a}</p>
      </div>
    </details>
  );
}

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title">
      <div className="wrap faq-grid">
        <div>
          <h2 id="faq-title" data-anim="type">
            Questions, <span className="accent">answered.</span>
          </h2>
          <p className="lead" data-reveal>
            Can’t find what you need? Ask our assistant, or send the team a message.
          </p>
          <ChatOpenButton className="btn btn-ghost" data-reveal>
            Ask the assistant
          </ChatOpenButton>
        </div>
        <div className="faq" data-reveal>
          {faqItems.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
