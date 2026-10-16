"use client";

import { useEffect, useRef, type MouseEvent, type PointerEvent } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { LinkButton } from "@/components/ui/Button";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** Fired when an item opens, so the others close (one answer at a time). */
const OPEN_EVENT = "faq:open";
/** How far (px) the toggle drifts towards the pointer. */
const MAGNET = 5;

/**
 * One FAQ entry: a native `<details>` disclosure, so keyboard and
 * screen-reader support come for free.
 *
 * - Opening one closes any other open entry, so the list reads as one
 *   focused answer at a time.
 * - With motion allowed, the height animates via the Web Animations API and
 *   the answer settles in just after the panel opens (fade, rise, blur).
 * - On pointer devices a soft spotlight and the card's gradient edge follow
 *   the cursor, and the +/- toggle leans slightly towards it.
 *
 * Under reduced motion every change is instant.
 */
export function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLSpanElement>(null);
  const animating = useRef<Animation | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  // Read by the "another entry opened" listener, which is bound once.
  const motionRef = useRef(!reducedMotion);
  useEffect(() => {
    motionRef.current = !reducedMotion;
  }, [reducedMotion]);

  function close(animate: boolean) {
    const details = detailsRef.current;
    const answer = answerRef.current;
    if (!details?.open || !answer) return;
    animating.current?.cancel();
    if (!animate || typeof answer.animate !== "function") {
      details.open = false;
      return;
    }
    details.classList.add("is-closing");
    const anim = answer.animate([{ height: `${answer.offsetHeight}px`, opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 420, easing: EASE });
    animating.current = anim;
    anim.onfinish = () => {
      details.open = false;
      details.classList.remove("is-closing");
      animating.current = null;
    };
  }

  function open(animate: boolean) {
    const details = detailsRef.current;
    const answer = answerRef.current;
    if (!details || !answer) return;
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: details }));
    details.open = true;
    if (!animate || typeof answer.animate !== "function") return;
    const anim = answer.animate([{ height: "0px", opacity: 0 }, { height: `${answer.offsetHeight}px`, opacity: 1 }], { duration: 520, easing: EASE });
    animating.current = anim;
    anim.onfinish = () => {
      animating.current = null;
    };
    answer.firstElementChild?.animate(
      [
        { opacity: 0, transform: "translateY(10px)", filter: "blur(6px)" },
        { opacity: 1, transform: "none", filter: "blur(0)" },
      ],
      { duration: 620, delay: 120, easing: EASE, fill: "backwards" }
    );
  }

  // Close when another entry opens.
  useEffect(() => {
    const onOpen = (event: Event) => {
      if ((event as CustomEvent<HTMLElement>).detail !== detailsRef.current) close(motionRef.current);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  function toggle(event: MouseEvent<HTMLElement>) {
    const details = detailsRef.current;
    if (!details) return;
    event.preventDefault();
    if (details.open && !details.classList.contains("is-closing")) close(!reducedMotion);
    else open(!reducedMotion);
  }

  function track(event: PointerEvent<HTMLElement>) {
    const details = detailsRef.current;
    if (!details || event.pointerType !== "mouse") return;
    const rect = details.getBoundingClientRect();
    details.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    details.style.setProperty("--my", `${event.clientY - rect.top}px`);
    const toggleEl = toggleRef.current;
    if (!toggleEl || reducedMotion) return;
    const t = toggleEl.getBoundingClientRect();
    const dx = event.clientX - (t.left + t.width / 2);
    const dy = event.clientY - (t.top + t.height / 2);
    const pull = Math.max(0, 1 - Math.hypot(dx, dy) / 220);
    toggleEl.style.setProperty("--tx", `${(dx / 220) * MAGNET * pull * 3}px`);
    toggleEl.style.setProperty("--ty", `${(dy / 220) * MAGNET * pull * 3}px`);
  }

  function release() {
    toggleRef.current?.style.setProperty("--tx", "0px");
    toggleRef.current?.style.setProperty("--ty", "0px");
  }

  const num = String(index + 1).padStart(2, "0");

  return (
    <details ref={detailsRef} className="faq-item" onPointerMove={track} onPointerLeave={release}>
      <summary onClick={toggle} data-cursor-tone="accent">
        {/* Decorative layers live inside <summary>: other <details>
            children are hidden while closed. They position against the
            <details> itself (the summary is not positioned). */}
        <span className="faq-spot" aria-hidden="true" />
        <span className="faq-edge" aria-hidden="true" />
        <span className="faq-scan" aria-hidden="true" />
        <span className="faq-num" aria-hidden="true">
          {num}
        </span>
        <span className="faq-q">{q}</span>
        <span className="faq-toggle" ref={toggleRef} aria-hidden="true">
          <i />
        </span>
      </summary>
      <div className="faq-a" ref={answerRef}>
        <div className="faq-a-inner">
          <p>{a}</p>
        </div>
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
