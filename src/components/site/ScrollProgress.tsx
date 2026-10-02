"use client";

import { useEffect, useRef, useState } from "react";
import { lenisInstance } from "@/lib/motion/lenisInstance";

/** Thin page-progress bar along the top plus a back-to-top button whose ring
 * fills with the same progress. Written straight to the DOM on scroll; React
 * state only flips when the button crosses its show threshold. */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
      buttonRef.current?.style.setProperty("--off", (100 - progress * 100).toFixed(1));
      // The footer has its own "Back to top" pill, so step aside once it shows.
      const footerTop = document.querySelector(".site-footer")?.getBoundingClientRect().top ?? Infinity;
      setVisible(window.scrollY > window.innerHeight * 0.8 && footerTop > window.innerHeight * 0.85);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  function toTop() {
    if (lenisInstance.current) lenisInstance.current.scrollTo(0);
    else window.scrollTo({ top: 0 });
  }

  return (
    <>
      <div ref={barRef} className="progress" aria-hidden="true" />
      <button
        ref={buttonRef}
        type="button"
        className={`to-top${visible ? " show" : ""}`}
        aria-label="Back to top"
        tabIndex={visible ? 0 : -1}
        onClick={toTop}
      >
        <svg className="ring-p" viewBox="0 0 48 48" aria-hidden="true">
          <circle className="track" cx="24" cy="24" r="22" />
          <circle className="fill" cx="24" cy="24" r="22" pathLength={100} />
        </svg>
        <svg className="arrow" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" />
        </svg>
      </button>
    </>
  );
}
