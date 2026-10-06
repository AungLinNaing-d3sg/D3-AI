"use client";

import { useEffect } from "react";
import { ensureGsapRegistered, gsap, ScrollTrigger, SplitText } from "@/lib/motion/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const all = <T extends HTMLElement = HTMLElement>(selector: string) => gsap.utils.toArray<T>(selector);
const one = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector);
const onEnter = (trigger: Element, start = "top 85%") => ({ trigger, start, once: true });

/**
 * Invisible controller for the homepage's scroll choreography. Sections are
 * plain server-rendered markup; each opts into its own reveal through
 * `data-anim`, so no two sections move the same way:
 *
 *  Hero      chars rise + flip · subtitle decodes · pinned, shrinks + blurs
 *            away while the frosted curtain rises from the bottom over it
 *            (the D3SG particle logo behind it disperses — HeroParticles)
 *  Marquee   loop whose speed and direction follow scroll velocity
 *  About     heading lines from a mask · statement lights up word by word
 *            (scrubbed) · values wipe in · phone rises out of a clip
 *  Services  pinned horizontal travel (≥1024px) · panel titles from a mask
 *  Process   dark panel expands to full size (scrubbed) · heading chars
 *            resolve in random order · step titles sharpen from blur
 *  Team      heading chars slide in skewed · cards wipe up
 *  FAQ       heading types itself out with a caret
 *  Contact   red panel grows out of an inset frame · heading words converge ·
 *            pinned and pushed back while the footer slides up over it
 *  Footer    columns rise in · particle wordmark assembles (FooterWordmark)
 *
 * Everything lives in one gsap.context / matchMedia and is reverted on
 * unmount. Nothing runs under reduced motion: globals.css then shows every
 * element in its final state.
 */
export function MotionDirector() {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    ensureGsapRegistered();

    let cancelled = false;
    let ctx: gsap.Context | undefined;
    let mm: gsap.MatchMedia | undefined;
    const cleanups: Array<() => void> = [];

    const build = () => {
      if (cancelled) return;

      ctx = gsap.context(() => {
        /* Generic fade-up for supporting copy and buttons. */
        gsap.set("[data-reveal]", { y: 16 });
        ScrollTrigger.batch("[data-reveal]", {
          start: "top 92%",
          once: true,
          onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.8, ease: "power2.out", stagger: 0.06, clearProps: "transform" }),
        });

        /* Hero: characters rise and flip up; the subtitle decodes. */
        const title = one('[data-anim="chars-rise"]');
        if (title) {
          const split = SplitText.create(title, { type: "words,chars", wordsClass: "word" });
          gsap.set(title, { opacity: 1 });
          // Starts once the particle logo has mostly gathered behind it.
          gsap.from(split.chars, { yPercent: 80, rotateX: -90, opacity: 0, filter: "blur(8px)", transformOrigin: "50% 100%", duration: 1.1, ease: "expo.out", stagger: 0.022, delay: 0.55 });
        }
        const subtitle = one('[data-anim="scramble"]');
        if (subtitle) {
          const text = subtitle.textContent ?? "";
          subtitle.textContent = "";
          gsap.set(subtitle, { opacity: 1 });
          gsap.to(subtitle, { duration: 1.6, delay: 1.1, ease: "none", scrambleText: { text, chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", revealDelay: 0.35, speed: 0.6 } });
        }

        /* Hero exit: pinned while the glass curtain slides over it. */
        const hero = one("#hero");
        const heroInner = hero?.querySelector(".hero-inner");
        if (hero && heroInner) {
          // One timeline owns both the pin and the fade (a separate trigger on the
          // pinned element would measure from the pin's end). The content is fully
          // gone by 60% of the way, so nothing ghosts through the glass curtain.
          gsap
            .timeline({ scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", pin: true, pinSpacing: false, scrub: true } })
            .to(heroInner, { scale: 0.88, y: -40, opacity: 0, filter: "blur(10px)", ease: "none", duration: 0.6 })
            .to({}, { duration: 0.4 });
        }

        /* Curtain: the second section rises from the bottom, widening from an
           inset card to full width, its contents trailing slightly behind. */
        const curtain = one(".curtain");
        if (curtain) {
          const rise = { trigger: curtain, start: "top bottom", end: "top top", scrub: true };
          gsap.fromTo(curtain, { scale: 0.9, borderRadius: "4.5rem 4.5rem 0 0" }, { scale: 1, borderRadius: "2.75rem 2.75rem 0 0", ease: "none", scrollTrigger: rise });
          gsap.fromTo(curtain.children, { y: 120 }, { y: 0, ease: "none", scrollTrigger: rise });
        }

        /* Marquee: two counter-moving rows. Speed and direction follow the
           scroll, rows lean with velocity, and each word lights up (--f) as it
           crosses the centre. Per-frame work only runs while it is visible. */
        const tracks = all(".marquee-track");
        if (tracks.length) {
          const loops = tracks.map((t, i) => {
            const dir = Number(t.dataset.dir) || -1;
            const tween = gsap.fromTo(t, { xPercent: dir < 0 ? 0 : -50 }, { xPercent: dir < 0 ? -50 : 0, ease: "none", duration: i ? 26 : 20, repeat: -1 });
            tween.totalTime(tween.duration() * 50); // room to play backwards
            return tween;
          });
          const skew = tracks.map((t) => gsap.quickTo(t, "skewX", { duration: 0.5, ease: "power3.out" }));
          const items = all(".mq-item");
          const glow = () => {
            const mid = window.innerWidth / 2;
            const reach = Math.max(window.innerWidth * 0.32, 260);
            items.forEach((item) => {
              const r = item.getBoundingClientRect();
              const d = Math.abs(r.left + (r.width - 40) / 2 - mid) / reach;
              const f = d >= 1 ? 0 : (1 - d) * (1 - d) * (3 - 2 * (1 - d));
              item.style.setProperty("--f", f.toFixed(3));
            });
          };
          let settle: gsap.core.Tween | undefined;
          ScrollTrigger.create({
            trigger: ".marquee",
            start: "top bottom",
            end: "bottom top",
            onToggle: (self) => (self.isActive ? gsap.ticker.add(glow) : gsap.ticker.remove(glow)),
            onUpdate: (self) => {
              const v = self.getVelocity();
              const boost = 1 + Math.min(Math.abs(v) / 220, 6);
              loops.forEach((loop) => gsap.to(loop, { timeScale: self.direction * boost, duration: 0.2, overwrite: true }));
              settle?.kill();
              settle = gsap.delayedCall(0.2, () => loops.forEach((loop) => gsap.to(loop, { timeScale: self.direction, duration: 1 })));
              const lean = gsap.utils.clamp(-10, 10, v / -260);
              skew.forEach((to, i) => to(i ? -lean : lean));
              gsap.delayedCall(0.15, () => skew.forEach((to) => to(0)));
            },
          });
          cleanups.push(() => gsap.ticker.remove(glow));
          // Rows rise in from the mask, staggered.
          gsap.from(".mq-row", { yPercent: 110, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.12, scrollTrigger: onEnter(one(".marquee")!, "top 92%") });
        }

        /* About. */
        all('[data-anim="mask-lines"]').forEach((el) => {
          const split = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "line" });
          gsap.set(el, { opacity: 1 });
          gsap.from(split.lines, { yPercent: 110, duration: 1, ease: "expo.out", stagger: 0.1, scrollTrigger: onEnter(el) });
        });
        all('[data-anim="scrub-words"]').forEach((el) => {
          const split = SplitText.create(el, { type: "words" });
          gsap.fromTo(split.words, { opacity: 0.12 }, { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 50%", scrub: true } });
        });
        all('[data-anim="wipe"]').forEach((el, i) => {
          gsap.fromTo(el, { opacity: 0, clipPath: "inset(0% 100% 0% 0%)" }, { opacity: 1, clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "expo.inOut", delay: i * 0.08, scrollTrigger: onEnter(el, "top 90%"), clearProps: "clipPath" });
        });
        all('[data-anim="clip-up"]').forEach((el) => {
          gsap.fromTo(el, { opacity: 0, y: 80, clipPath: "inset(30% 10% 0% 10% round 48px)" }, { opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0% round 0px)", duration: 1.3, ease: "expo.out", scrollTrigger: onEnter(el), clearProps: "clipPath,transform" });
        });

        /* Process: the dark panel expands into place; steps activate in turn. */
        const panel = one("[data-process-panel]");
        if (panel) {
          gsap.fromTo(panel, { scale: 0.9, borderRadius: "4rem" }, { scale: 1, borderRadius: "2.25rem", ease: "none", scrollTrigger: { trigger: panel, start: "top bottom", end: "top 15%", scrub: true } });
        }
        all('[data-anim="random-chars"]').forEach((el) => {
          const split = SplitText.create(el, { type: "words,chars" });
          gsap.set(el, { opacity: 1 });
          gsap.from(split.chars, { opacity: 0, duration: 0.5, ease: "power1.out", stagger: { each: 0.025, from: "random" }, scrollTrigger: onEnter(el) });
        });
        all('[data-anim="blur-in"]').forEach((el) => {
          gsap.fromTo(el, { opacity: 0, filter: "blur(12px)", letterSpacing: "0.35em" }, { opacity: 1, filter: "blur(0px)", letterSpacing: "-0.01em", duration: 1.2, ease: "expo.out", scrollTrigger: onEnter(el, "top 80%") });
        });
        const steps = all(".step");
        steps.forEach((step, i) => {
          // The last step stays lit once reached, rather than dimming as the panel leaves.
          ScrollTrigger.create({ trigger: step, start: "top 65%", end: i === steps.length - 1 ? "bottom top" : "bottom 45%", toggleClass: "is-active" });
        });
        if (one(".rail i")) {
          gsap.to(".rail i", { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".steps", start: "top 65%", end: "bottom 55%", scrub: true } });
        }
        const ms = one("[data-ms]");
        if (ms) {
          let timer: ReturnType<typeof setInterval> | undefined;
          ScrollTrigger.create({
            trigger: ms.closest(".step") ?? ms,
            start: "top 65%",
            end: "bottom 45%",
            onToggle: (self) => {
              clearInterval(timer);
              if (self.isActive) timer = setInterval(() => { ms.textContent = String(160 + Math.round(Math.random() * 45)); }, 1200);
            },
          });
          cleanups.push(() => clearInterval(timer));
        }

        /* Team: skewed characters, cards wipe up. */
        all('[data-anim="skew-chars"]').forEach((el) => {
          const split = SplitText.create(el, { type: "words,chars" });
          gsap.set(el, { opacity: 1 });
          gsap.from(split.chars, { x: 40, skewX: -30, opacity: 0, duration: 0.9, ease: "expo.out", stagger: 0.02, scrollTrigger: onEnter(el) });
        });
        const cards = all('[data-anim="card-wipe"]');
        if (cards[0]) {
          gsap.fromTo(cards, { opacity: 0, clipPath: "inset(100% 0% 0% 0% round 28px)" }, { opacity: 1, clipPath: "inset(0% 0% 0% 0% round 28px)", duration: 1.2, ease: "expo.inOut", stagger: 0.12, scrollTrigger: onEnter(cards[0], "top 85%"), clearProps: "clipPath" });
        }

        /* FAQ: the heading types itself out, caret following each letter. */
        all('[data-anim="type"]').forEach((el) => {
          const split = SplitText.create(el, { type: "words,chars" });
          const caret = document.createElement("span");
          caret.className = "typing-caret";
          caret.setAttribute("aria-hidden", "true");
          gsap.set(el, { opacity: 1 });
          gsap.set(split.chars, { opacity: 0 });
          gsap.to(split.chars, {
            opacity: 1,
            duration: 0.01,
            ease: "none",
            stagger: {
              each: 0.05,
              onStart() {
                // GSAP runs each stagger callback with the per-character tween as `this`.
                const char = (this as unknown as gsap.core.Tween).targets()[0] as HTMLElement | undefined;
                char?.after(caret);
              },
            },
            scrollTrigger: onEnter(el),
            onComplete: () => { gsap.delayedCall(1.4, () => caret.remove()); },
          });
        });

        /* Contact: panel grows out of an inset frame; heading words converge. */
        const cta = one('[data-anim="expand"]');
        if (cta) {
          gsap.fromTo(cta, { opacity: 1, clipPath: "inset(6% 8% 6% 8% round 64px)" }, { clipPath: "inset(0% 0% 0% 0% round 36px)", ease: "none", scrollTrigger: { trigger: cta, start: "top 95%", end: "top 30%", scrub: true } });
        }
        all('[data-anim="spread"]').forEach((el) => {
          const split = SplitText.create(el, { type: "words" });
          const mid = (split.words.length - 1) / 2;
          gsap.fromTo(split.words, { x: (i: number) => (i - mid) * 70, opacity: 0.25 }, { x: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: el, start: "top 95%", end: "top 45%", scrub: true } });
        });

        /* Footer covers Contact: the section pins as it bottoms out, then sinks
           back (scale + dim) while the footer panel slides up over it. */
        const contact = one("#contact");
        const footer = one(".site-footer");
        if (contact && footer) {
          const cover = { trigger: contact, start: "bottom bottom", end: () => `+=${footer.offsetHeight}`, scrub: true };
          ScrollTrigger.create({ ...cover, pin: true, pinSpacing: false });
          const panel = contact.querySelector(".cta");
          // Stay fully readable while the footer's first third rises, then sink back.
          if (panel) {
            gsap
              .timeline({ scrollTrigger: cover })
              .to({}, { duration: 0.35 })
              .to(panel, { scale: 0.93, opacity: 0.4, filter: "blur(4px)", ease: "none", duration: 0.65 });
          }
        }
        const footRows = all("[data-foot-reveal]");
        if (footRows[0]) {
          gsap.from(footRows, { y: 40, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.12, scrollTrigger: onEnter(footRows[0], "top 90%") });
        }
      });

      /* Services: horizontal travel on wide screens, simple reveals otherwise. */
      mm = gsap.matchMedia();
      mm.add("(min-width: 1024px)", () => {
        const pin = one(".h-pin");
        const track = pin?.querySelector<HTMLElement>(".panels");
        if (!pin || !track) return;
        // Travel until the last panel's right edge meets the gutter.
        const distance = () => {
          const last = track.lastElementChild as HTMLElement | null;
          if (!last) return 0;
          const gutter = parseFloat(getComputedStyle(track).paddingLeft) || 0;
          return Math.max(0, last.offsetLeft + last.offsetWidth + gutter - window.innerWidth);
        };
        const travel = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: { trigger: pin, start: "center center", end: () => `+=${distance()}`, pin: true, scrub: true, invalidateOnRefresh: true },
        });
        all('[data-anim="panel-title"]').forEach((el) => {
          const split = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "line" });
          gsap.set(el, { opacity: 1 });
          gsap.from(split.lines, { yPercent: 110, duration: 1, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: el, containerAnimation: travel, start: "left 85%", once: true } });
        });
      });
      mm.add("(max-width: 1023px)", () => {
        all('[data-anim="panel-title"]').forEach((el) => {
          const split = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "line" });
          gsap.set(el, { opacity: 1 });
          gsap.from(split.lines, { yPercent: 110, duration: 1, ease: "expo.out", stagger: 0.08, scrollTrigger: onEnter(el) });
        });
      });

      // Pins were created out of page order; sort so every trigger measures correctly.
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    };

    // Splitting and pin measurements need the final webfont metrics.
    if (document.fonts?.ready) document.fonts.ready.then(build);
    else build();

    return () => {
      cancelled = true;
      cleanups.forEach((cleanup) => cleanup());
      mm?.revert();
      ctx?.revert();
    };
  }, [reducedMotion]);

  return null;
}
