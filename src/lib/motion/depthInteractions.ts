import { gsap } from "@/lib/motion/gsap";
import { damp } from "@/lib/motion/mathUtils";

/**
 * Desktop-only cursor depth for HTML surfaces — the DOM counterpart of the
 * camera rig's pointer parallax (three/CameraRig.tsx), so cards and buttons
 * react to the cursor the same smoothed way the 3D world does.
 *
 * One delegated `pointermove` listener on the document finds the surface
 * under the cursor by attribute, and one `gsap.ticker` callback (the same
 * ticker that already drives Lenis — see SmoothScrollProvider) damps each
 * surface toward its target and writes plain CSS custom properties. CSS
 * (globals.css "Depth surfaces") turns those into transforms, so:
 * - no React state and no re-renders;
 * - Server Components opt in with a data attribute alone;
 * - the ticker only runs while something is still settling.
 *
 * Opt-in attributes:
 * - `data-depth-tilt` — glass cards: a 3° max rotation toward the cursor,
 *   a highlight that follows it (`--glare-x/y`) and `--depth-px/py`
 *   (-1..1), which inner `.depth-layer` elements read to shift by
 *   different amounts for shallow internal depth.
 * - `data-depth-magnetic` — buttons: drift up to a few px toward the
 *   cursor (`--magnet-x/y`).
 *
 * Started by `ScrollChoreographer` only for a fine, hovering pointer on the
 * desktop tier with motion allowed; never on touch or reduced motion.
 */

const TILT_SELECTOR = "[data-depth-tilt]";
const MAGNETIC_SELECTOR = "[data-depth-magnetic]";

/** Max card rotation, degrees — the brief's 2–4° range. */
const MAX_TILT_DEG = 3;
/** Max magnetic drift, px. */
const MAGNET_X = 6;
const MAGNET_Y = 4;
/** How quickly surfaces follow the cursor (see `damp`). Low enough that a
 * fast flick reads as weight, never as the card chasing the pointer. */
const TILT_LAMBDA = 5;
const MAGNET_LAMBDA = 7;
const SETTLE_EPSILON = 0.002;

type SurfaceKind = "tilt" | "magnetic";

interface SurfaceState {
  kind: SurfaceKind;
  /** Pointer position over the element, -1..1 on each axis. */
  targetX: number;
  targetY: number;
  targetHover: number;
  x: number;
  y: number;
  hover: number;
}

export function initDepthInteractions(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const surfaces = new Map<HTMLElement, SurfaceState>();
  let hovered: HTMLElement[] = [];
  let ticking = false;

  function stateFor(el: HTMLElement, kind: SurfaceKind): SurfaceState {
    let state = surfaces.get(el);
    if (!state) {
      state = { kind, targetX: 0, targetY: 0, targetHover: 0, x: 0, y: 0, hover: 0 };
      surfaces.set(el, state);
    }
    return state;
  }

  function release(el: HTMLElement) {
    const state = surfaces.get(el);
    if (!state) return;
    state.targetX = 0;
    state.targetY = 0;
    state.targetHover = 0;
  }

  function write(el: HTMLElement, state: SurfaceState) {
    const style = el.style;
    if (state.kind === "magnetic") {
      style.setProperty("--magnet-x", `${(state.x * MAGNET_X).toFixed(2)}px`);
      style.setProperty("--magnet-y", `${(state.y * MAGNET_Y).toFixed(2)}px`);
      return;
    }
    style.setProperty("--tilt-x", `${(-state.y * MAX_TILT_DEG).toFixed(3)}deg`);
    style.setProperty("--tilt-y", `${(state.x * MAX_TILT_DEG).toFixed(3)}deg`);
    style.setProperty("--depth-px", state.x.toFixed(4));
    style.setProperty("--depth-py", state.y.toFixed(4));
    style.setProperty("--glare-x", `${((state.x + 1) * 50).toFixed(2)}%`);
    style.setProperty("--glare-y", `${((state.y + 1) * 50).toFixed(2)}%`);
    style.setProperty("--hover", state.hover.toFixed(3));
  }

  /** Back to the CSS defaults (all zero) once a surface has settled. */
  function clear(el: HTMLElement) {
    for (const name of ["--magnet-x", "--magnet-y", "--tilt-x", "--tilt-y", "--depth-px", "--depth-py", "--glare-x", "--glare-y", "--hover"]) {
      el.style.removeProperty(name);
    }
  }

  function tick() {
    // gsap.ticker's `deltaRatio` is frames-at-60fps; convert to seconds.
    const delta = gsap.ticker.deltaRatio(60) / 60;
    surfaces.forEach((state, el) => {
      const lambda = state.kind === "magnetic" ? MAGNET_LAMBDA : TILT_LAMBDA;
      state.x = damp(state.x, state.targetX, lambda, delta);
      state.y = damp(state.y, state.targetY, lambda, delta);
      state.hover = damp(state.hover, state.targetHover, lambda, delta);

      const settled =
        state.targetHover === 0 &&
        Math.abs(state.x) < SETTLE_EPSILON &&
        Math.abs(state.y) < SETTLE_EPSILON &&
        state.hover < SETTLE_EPSILON;
      if (settled) {
        clear(el);
        surfaces.delete(el);
        return;
      }
      write(el, state);
    });
    if (surfaces.size === 0) stopTicker();
  }

  function startTicker() {
    if (ticking) return;
    ticking = true;
    gsap.ticker.add(tick);
  }

  function stopTicker() {
    if (!ticking) return;
    ticking = false;
    gsap.ticker.remove(tick);
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    const target = event.target instanceof Element ? event.target : null;
    const tilt = target?.closest<HTMLElement>(TILT_SELECTOR) ?? null;
    const magnetic = target?.closest<HTMLElement>(MAGNETIC_SELECTOR) ?? null;
    const next = [tilt, magnetic].filter((el): el is HTMLElement => el !== null);

    hovered.forEach((el) => {
      if (!next.includes(el)) release(el);
    });
    hovered = next;

    next.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const state = stateFor(el, el === tilt ? "tilt" : "magnetic");
      state.targetX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
      state.targetY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
      state.targetHover = 1;
    });

    if (surfaces.size > 0) startTicker();
  }

  /** The page moving under a still cursor (wheel/Lenis/keyboard scroll)
   * would leave a stale tilt on whatever was hovered — ease everything back
   * to rest; the next real pointer move picks it up again. */
  function releaseAll() {
    hovered.forEach(release);
    hovered = [];
  }

  function onPointerOut(event: PointerEvent) {
    if (event.relatedTarget === null) releaseAll();
  }

  document.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerout", onPointerOut, { passive: true });
  window.addEventListener("scroll", releaseAll, { passive: true });
  window.addEventListener("blur", releaseAll);

  return () => {
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerout", onPointerOut);
    window.removeEventListener("scroll", releaseAll);
    window.removeEventListener("blur", releaseAll);
    stopTicker();
    surfaces.forEach((_, el) => clear(el));
    surfaces.clear();
    hovered = [];
  };
}
