"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * The site's cursor: an animated arrow that sheds firework sparks.
 *
 * - The arrow (SVG) sits with its tip exactly on the pointer — no lag, so
 *   clicking stays precise. A pearl body, an edge of light flowing orange →
 *   amber → cyan around the outline, a softly breathing glow, a drop shadow
 *   for depth, and a slight lean into the direction of travel.
 * - Moving sheds sparks from behind the arrow in the site's palette: mostly
 *   white-hot → gold → D3-SG orange → rose embers, with the odd cyan one for
 *   the AI accent. They drift back, fall a little, flicker and fade.
 * - A click sets off a small firework: a burst of streaks, then a crackle
 *   of glitter.
 * - Over links/buttons the arrow warms (orange glow, faster shimmer) and a
 *   few embers rise from its tip; the primary CTA (`data-cursor-tone=
 *   "accent"`) glows a little more. Text fields keep the native I-beam.
 *
 * Sparks live on one full-viewport 2D canvas; everything is `pointer-events:
 * none`. One fixed spark pool (no allocation per frame), one rAF loop that
 * runs only while something is moving or glowing and stops by itself, and
 * no React state per movement. Fine hovering pointers only — touch devices
 * and reduced motion keep the normal cursor. Mounted once in the root
 * layout; a second instance renders nothing.
 */

const INTERACTIVE =
  'a[href], button, [role="button"], [role="link"], [role="switch"], [role="tab"], [role="menuitem"], summary, label[for], select, [contenteditable="true"], [tabindex]:not([tabindex="-1"]), [data-cursor]';
const TEXT_INPUT =
  'textarea, [contenteditable="true"], input:not([type]), input[type="text"], input[type="email"], input[type="search"], input[type="tel"], input[type="url"], input[type="password"], input[type="number"]';

export type CursorMode = "default" | "hover" | "text";

/** The cursor's reaction to the element under the pointer. */
export function resolveCursorTarget(el: Element | null): { mode: CursorMode; accent: boolean } {
  if (!el) return { mode: "default", accent: false };
  if (el.closest(TEXT_INPUT)) return { mode: "text", accent: false };
  const target = el.closest<HTMLElement>(INTERACTIVE);
  if (!target || target.dataset.cursor === "default" || (target as HTMLButtonElement).disabled) {
    return { mode: "default", accent: false };
  }
  return { mode: "hover", accent: target.closest<HTMLElement>("[data-cursor-tone]")?.dataset.cursorTone === "accent" };
}

/* Sparks ------------------------------------------------------------ */

const POOL = 180;
/** Warm ember palette over a spark's life (hot → cool), and the cyan accent. */
const WARM = ["255, 246, 222", "255, 196, 110", "253, 106, 80", "196, 64, 104"];
const COOL = ["236, 252, 255", "125, 232, 249", "59, 130, 246", "99, 70, 220"];

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  cool: boolean;
  gravity: number;
  /** Bursts into glitter when it dies (click fireworks). */
  crackle: boolean;
}

/** Palette stage for a spark's remaining life f (1 just born → 0 dead). */
function stageAt(f: number): number {
  return f > 0.82 ? 0 : f > 0.55 ? 1 : f > 0.24 ? 2 : 3;
}

function colorAt(palette: string[], f: number, alpha: number): string {
  return `rgba(${palette[stageAt(f)]}, ${alpha.toFixed(3)})`;
}

/** Soft radial glow sprites, one per palette colour — drawn once, then
 * stamped with drawImage (no gradient objects per spark per frame). */
function makeGlowSprites(palette: string[]): HTMLCanvasElement[] {
  return palette.map((rgb) => {
    const size = 64;
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = size;
    const g = sprite.getContext("2d");
    if (g) {
      const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, `rgba(${rgb}, 0.9)`);
      gradient.addColorStop(0.25, `rgba(${rgb}, 0.35)`);
      gradient.addColorStop(1, `rgba(${rgb}, 0)`);
      g.fillStyle = gradient;
      g.fillRect(0, 0, size, size);
    }
    return sprite;
  });
}

let instanceMounted = false;

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const arrowRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const id = useId().replace(/:/g, "");

  // Fine hovering pointer, no reduced motion — follows either changing.
  useEffect(() => {
    if (instanceMounted) return;
    instanceMounted = true;
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(pointer.matches && !reduced.matches);
    update();
    pointer.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      instanceMounted = false;
      pointer.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const arrow = arrowRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!arrow || !canvas || !ctx) return;
    const html = document.documentElement;
    const warmGlow = makeGlowSprites(WARM);
    const coolGlow = makeGlowSprites(COOL);

    const pool: Spark[] = Array.from({ length: POOL }, () => ({
      x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, cool: false, gravity: 0, crackle: false,
    }));
    let next = 0;
    let alive = 0;
    const emit = (x: number, y: number, vx: number, vy: number, life: number, size: number, cool: boolean, gravity: number, crackle = false) => {
      const s = pool[next]!;
      next = (next + 1) % POOL;
      if (s.life <= 0) alive += 1;
      s.x = x;
      s.y = y;
      s.vx = vx;
      s.vy = vy;
      s.life = s.max = life;
      s.size = size;
      s.cool = cool;
      s.gravity = gravity;
      s.crackle = crackle;
    };

    // Pointer & arrow state.
    const pos = { x: -100, y: -100 };
    const last = { x: -100, y: -100 };
    let visible = false;
    let mode: CursorMode = "default";
    let lean = 0;
    let scale = 1;
    let pressed = false;
    let travel = 0;
    let emberClock = 0;
    let frame = 0;
    let prevTime = 0;
    let painted = false;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const wake = () => {
      if (!frame) {
        prevTime = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };

    const show = () => {
      if (visible) return;
      visible = true;
      last.x = pos.x;
      last.y = pos.y;
      arrow.dataset.visible = "true";
      html.classList.add("has-custom-cursor");
    };
    const hide = () => {
      if (!visible) return;
      visible = false;
      arrow.dataset.visible = "false";
      html.classList.remove("has-custom-cursor");
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return hide();
      pos.x = event.clientX;
      pos.y = event.clientY;
      show();
      wake();
    };
    const onOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const target = resolveCursorTarget(event.target as Element);
      mode = target.mode;
      arrow.dataset.mode = target.mode;
      arrow.dataset.accent = String(target.accent);
      wake();
    };
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pressed = true;
      // A small firework at the tip: streaks, some of which crackle.
      const warmBias = arrow.dataset.accent === "true" ? 0.95 : 0.78;
      for (let i = 0; i < 32; i += 1) {
        const a = (i / 32) * Math.PI * 2 + Math.random() * 0.25;
        const v = 140 + Math.random() * 200;
        emit(pos.x, pos.y, Math.cos(a) * v, Math.sin(a) * v - 30, 0.55 + Math.random() * 0.4, 1.3 + Math.random() * 1.1, Math.random() > warmBias, 190, Math.random() < 0.35);
      }
      wake();
    };
    const onUp = () => {
      pressed = false;
      wake();
    };
    const onLeave = (event: MouseEvent) => {
      if (!event.relatedTarget) hide();
    };

    const tick = (now: number): void => {
      frame = 0;
      const dt = Math.min((now - prevTime) / 1000, 1 / 20);
      prevTime = now;
      let busy = false;

      // Arrow: exact position; lean and press eased.
      const dx = pos.x - last.x;
      const dy = pos.y - last.y;
      const vx = dt > 0 ? dx / dt : 0;
      const targetLean = Math.max(-16, Math.min(16, vx * 0.012));
      lean += (targetLean - lean) * (1 - Math.exp(-dt * 12));
      const targetScale = (pressed ? 0.86 : 1) * (mode === "hover" ? 1.06 : 1);
      scale += (targetScale - scale) * (1 - Math.exp(-dt * 16));
      if (Math.abs(targetLean - lean) > 0.05 || Math.abs(targetScale - scale) > 0.002 || dx !== 0 || dy !== 0) busy = true;
      arrow.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${lean.toFixed(2)}deg) scale(${scale.toFixed(3)})`;

      // Movement sheds sparks from behind the arrow, along the path.
      if (visible) {
        const dist = Math.hypot(dx, dy);
        travel += dist;
        const count = Math.min(8, Math.floor(travel / 6));
        travel -= count * 6;
        for (let i = 0; i < count; i += 1) {
          const t = (i + 1) / (count + 1);
          emit(
            last.x + dx * t + 6 + (Math.random() - 0.5) * 4,
            last.y + dy * t + 12 + (Math.random() - 0.5) * 4,
            -dx * 1.5 + (Math.random() - 0.5) * 70,
            -dy * 1.5 + (Math.random() - 0.5) * 70 - 20,
            0.6 + Math.random() * 0.55,
            1.3 + Math.random() * 1.6,
            Math.random() < 0.2,
            130
          );
        }
        // Hovering something interactive: a few embers rise from the tip.
        if (mode === "hover") {
          emberClock += dt;
          if (emberClock > 0.12) {
            emberClock = 0;
            emit(pos.x + 2, pos.y + 2, (Math.random() - 0.5) * 30, -40 - Math.random() * 30, 0.6 + Math.random() * 0.4, 0.8 + Math.random() * 0.8, Math.random() < 0.25, -20);
          }
          busy = true;
        }
      }
      last.x = pos.x;
      last.y = pos.y;

      // Sparks — the canvas is cleared only when something was drawn.
      if (painted || alive > 0) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      painted = false;
      if (alive > 0) {
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        for (const s of pool) {
          if (s.life <= 0) continue;
          s.life -= dt;
          if (s.life <= 0) {
            alive -= 1;
            if (s.crackle) {
              // Glitter: a crackle of tiny short-lived sparks.
              for (let k = 0; k < 4; k += 1) {
                const a = Math.random() * Math.PI * 2;
                const v = 25 + Math.random() * 45;
                emit(s.x, s.y, Math.cos(a) * v, Math.sin(a) * v, 0.18 + Math.random() * 0.16, 0.7, s.cool, 40);
              }
            }
            continue;
          }
          const drag = Math.exp(-dt * 2.6);
          s.vx *= drag;
          s.vy = s.vy * drag + s.gravity * dt;
          const px = s.x;
          const py = s.y;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          const f = s.life / s.max;
          const flicker = 0.75 + 0.25 * Math.sin(now * 0.05 + s.x);
          const alpha = Math.min(1, f * 1.4) * flicker;
          const palette = s.cool ? COOL : WARM;
          // A streak along the motion…
          ctx.strokeStyle = colorAt(palette, f, alpha * 0.85);
          ctx.lineWidth = s.size * (0.4 + f * 0.8);
          ctx.beginPath();
          ctx.moveTo(px - s.vx * 0.032, py - s.vy * 0.032);
          ctx.lineTo(s.x, s.y);
          ctx.stroke();
          // …a hot head while young, and a soft halo of its colour.
          if (f > 0.35) {
            const glow = (s.cool ? coolGlow : warmGlow)[stageAt(f)]!;
            const r = s.size * 4.2;
            ctx.globalAlpha = alpha * 0.55;
            ctx.drawImage(glow, s.x - r, s.y - r, r * 2, r * 2);
            ctx.globalAlpha = 1;
            ctx.fillStyle = colorAt(palette, 1, alpha * 0.7);
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * 0.85, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalCompositeOperation = "source-over";
        painted = true;
        busy = true;
      }

      if (busy) wake();
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointercancel", onUp, { passive: true });
    document.addEventListener("mouseout", onLeave, { passive: true });
    window.addEventListener("blur", hide);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frame);
      hide();
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.removeEventListener("mouseout", onLeave);
      window.removeEventListener("blur", hide);
      window.removeEventListener("resize", resize);
    };
  }, [enabled]);

  if (!enabled) return null;

  const arrowPath = "M0 0 L0 21.5 L5.6 16.6 L9.3 25 L13 23.4 L9.4 15.2 L16.6 15.2 Z";

  return (
    <>
      <canvas ref={canvasRef} className="cursor-fx" aria-hidden="true" />
      <div ref={arrowRef} className="cursor-arrow" aria-hidden="true" data-visible="false" data-mode="default" data-accent="false">
        <svg width="30" height="36" viewBox="-5 -5 30 36" overflow="visible">
          <defs>
            <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.55" stopColor="#eef8ff" />
              <stop offset="1" stopColor="#c9ecff" />
            </linearGradient>
            <linearGradient id={`${id}-edge`} gradientUnits="userSpaceOnUse" x1="-8" y1="-8" x2="22" y2="30" spreadMethod="reflect">
              <stop offset="0" stopColor="#fd6a50" />
              <stop offset="0.5" stopColor="#ffc16b" />
              <stop offset="1" stopColor="#67e8f9" />
              <animateTransform attributeName="gradientTransform" type="translate" values="0 0; 14 18; 0 0" dur="3.2s" repeatCount="indefinite" />
            </linearGradient>
            <filter id={`${id}-soft`} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
          </defs>
          {/* Depth: a soft drop shadow. */}
          <path d={arrowPath} fill="#000" opacity="0.45" transform="translate(1.6 2.6)" filter={`url(#${id}-soft)`} />
          {/* The glow, breathing (CSS). */}
          <path className="cursor-arrow-glow" d={arrowPath} fill="none" stroke={`url(#${id}-edge)`} strokeWidth="4" strokeLinejoin="round" filter={`url(#${id}-soft)`} />
          {/* Body and flowing edge. */}
          <path d={arrowPath} fill={`url(#${id}-body)`} stroke={`url(#${id}-edge)`} strokeWidth="1.5" strokeLinejoin="round" />
          {/* A light running around the outline. */}
          <path className="cursor-arrow-run" d={arrowPath} fill="none" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" pathLength="100" />
          {/* Bevel highlight. */}
          <path d="M1.9 4.2 L1.9 16.4" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.85" />
        </svg>
      </div>
    </>
  );
}
