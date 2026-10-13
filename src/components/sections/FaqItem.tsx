"use client";

import { useRef, type MouseEvent } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { LinkButton } from "@/components/ui/Button";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * One FAQ entry (from development_v2): a native `<details>` disclosure, so
 * keyboard and screen-reader support come for free, with the open/close
 * height animated via the Web Animations API when motion is allowed. Under
 * reduced motion the default toggle is left alone.
 */
export function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
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
    <details ref={detailsRef} className="faq-item v2-glass">
      <summary onClick={toggle}>
        <span className="v2-edge" aria-hidden="true" />
        <span className="faq-rail" aria-hidden="true" />
        <span className="faq-num" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="faq-q">{q}</span>
        <i aria-hidden="true" />
      </summary>
      <div className="faq-a" ref={answerRef}>
        <p>{a}</p>
      </div>
    </details>
  );
}

/** Route from the FAQ to the contact form. Lives in this client file
 * because an in-page `LinkButton` attaches a scroll handler. */
export function FaqAskLink() {
  return (
    <LinkButton href="#contact" variant="secondary" className="px-6 py-3 text-sm">
      Ask the team
    </LinkButton>
  );
}
