"use client";

import { useEffect, useRef } from "react";
import { ensureGsapRegistered, gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { lenisInstance } from "@/lib/motion/lenisInstance";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Leader "dossier" choreography, ported from the light redesign's Team
 * section (development_v2 MotionDirector):
 *
 * - ≥1024px: the stage is sticky (CSS) and a scrubbed timeline slides each
 *   card up over the previous one, which sinks back and blurs. The index
 *   and its progress rail follow; clicking an entry scrolls to that card.
 * - Smaller screens: cards flow normally and reveal as they enter.
 * - Every size: each portrait scans in once, its stat counts up, and fine
 *   pointers tilt the card with a following sheen.
 *
 * Under reduced motion nothing runs; CSS shows every card in its final state.
 */
export function useLeaderDossier() {
  const stageRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || reducedMotion) return;
    ensureGsapRegistered();

    const cards = Array.from(stage.querySelectorAll<HTMLElement>(".dossier"));
    const indexItems = Array.from(stage.querySelectorAll<HTMLButtonElement>(".dossier-index-item"));
    const progress = stage.querySelector<HTMLElement>(".dossier-progress");
    const cleanups: Array<() => void> = [];
    const scanned = new Set<number>();

    const highlight = (i: number) => indexItems.forEach((item, k) => item.classList.toggle("is-active", k === i));
    const scan = (i: number) => {
      const card = cards[i];
      if (!card || scanned.has(i)) return;
      scanned.add(i);
      card.classList.add("is-scanned");
      const stat = card.querySelector<HTMLElement>("[data-count]");
      if (!stat) return;
      const end = Number(stat.dataset.count);
      const v = { n: 0 };
      gsap.to(v, { n: end, duration: 1.6, ease: "power2.out", delay: 0.3, onUpdate: () => { stat.textContent = String(Math.round(v.n)); } });
    };

    const scrollTo = (y: number) => (lenisInstance.current ? lenisInstance.current.scrollTo(y, { duration: 1.2 }) : window.scrollTo({ top: y, behavior: "smooth" }));
    let jumpTargets = () => cards.map((c) => c.getBoundingClientRect().top + window.scrollY - 120);
    indexItems.forEach((item, i) => {
      const onClick = () => {
        const target = jumpTargets()[i];
        if (target !== undefined) scrollTo(target);
      };
      item.addEventListener("click", onClick);
      cleanups.push(() => item.removeEventListener("click", onClick));
    });

    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      const steps = cards.length - 1;
      stage.classList.add("is-stacked");
      ScrollTrigger.create({ trigger: stage, start: "top 70%", once: true, onEnter: () => scan(0) });
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: stage,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const pos = self.progress * steps;
            progress?.style.setProperty("--p", steps ? String(self.progress) : "1");
            highlight(Math.min(steps, Math.round(pos)));
            for (let k = 1; k <= steps; k++) if (pos >= k - 0.75) scan(k);
          },
        },
      });
      for (let k = 1; k <= steps; k++) {
        tl.fromTo(cards[k]!, { yPercent: 108, rotateX: -8 }, { yPercent: 0, rotateX: 0, ease: "power2.inOut", duration: 1 }, k - 1).to(
          cards[k - 1]!,
          { scale: 0.9, yPercent: -6, opacity: 0.3, filter: "blur(6px)", ease: "power2.inOut", duration: 1 },
          k - 1
        );
      }
      const st = tl.scrollTrigger!;
      jumpTargets = () => cards.map((_, i) => st.start + ((st.end - st.start) * i) / Math.max(steps, 1) + (i ? 2 : 0));
      return () => {
        stage.classList.remove("is-stacked");
        jumpTargets = () => cards.map((c) => c.getBoundingClientRect().top + window.scrollY - 120);
      };
    });
    mm.add("(max-width: 1023px)", () => {
      cards.forEach((card, i) => {
        ScrollTrigger.create({ trigger: card, start: "top 75%", once: true, onEnter: () => { scan(i); highlight(i); } });
        gsap.fromTo(card, { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: card, start: "top 90%", once: true } });
      });
    });

    // Tilt towards the pointer with a following sheen (fine pointers only).
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      stage.querySelectorAll<HTMLElement>("[data-tilt3d]").forEach((card) => {
        const move = (event: PointerEvent) => {
          const r = card.getBoundingClientRect();
          const x = (event.clientX - r.left) / r.width;
          const y = (event.clientY - r.top) / r.height;
          card.style.setProperty("--ry", `${((x - 0.5) * 7).toFixed(2)}deg`);
          card.style.setProperty("--rx", `${((0.5 - y) * 5).toFixed(2)}deg`);
          card.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
          card.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
        };
        const leave = () => {
          card.style.setProperty("--rx", "0deg");
          card.style.setProperty("--ry", "0deg");
        };
        card.addEventListener("pointermove", move);
        card.addEventListener("pointerleave", leave);
        cleanups.push(() => {
          card.removeEventListener("pointermove", move);
          card.removeEventListener("pointerleave", leave);
        });
      });
    }

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      mm.revert();
    };
  }, [reducedMotion]);

  return stageRef;
}
