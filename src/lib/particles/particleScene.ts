import { displayFamily, samplePoints, type Box } from "./particleWordmark";
import { gapFocus, SHAPES, shapePoints, waveHeight, type ShapeKind } from "./shapes";

/**
 * Background particle field for the homepage.
 *
 * - Hero: the dots form the "D3SG" logo (assembling on load).
 * - Section gaps: when a boundary between two sections passes through the
 *   middle of the screen, the dots gather into a slowly rotating geometric
 *   shape centred on that boundary, then dissolve as the next section takes
 *   over. Inside sections nothing is drawn, so content sits on a clean
 *   background.
 */

export interface SceneOptions {
  /** IDs of the sections whose top edge marks each gap, in page order. */
  gapSections: string[];
  /** One shape per gap (cycled if fewer). */
  shapes?: ShapeKind[];
  maxParticles: number;
  dotSize: number;
  repelRadius: number;
  heroLayout: (width: number, height: number) => Box;
}

const INK = "#0d0e11";
const RED = "#e5412d";
const HERO_ALPHA = 0.36;
/** Brightness levels for the hero logo (light sweep + pointer glow). */
const LEVELS = 4;
const HERO_PEAK_ALPHA = 0.9;
const SHAPE_ALPHA = 0.34;

export class ParticleScene {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private n = 0;
  private x = new Float32Array(0);
  private y = new Float32Array(0);
  private vx = new Float32Array(0);
  private vy = new Float32Array(0);
  private logoX = new Float32Array(0);
  private logoY = new Float32Array(0);
  private logoAccent = new Uint8Array(0);
  private dirX = new Float32Array(0);
  private dirY = new Float32Array(0);
  private shapeAccent = new Uint8Array(0);
  private shapes: Float32Array[] = [];
  private kinds: ShapeKind[] = [];
  private raf = 0;
  private running = false;
  private pointer = { x: -9999, y: -9999 };
  private introStart = 0;
  private cleared = false;
  private level = new Uint8Array(0);

  constructor(private canvas: HTMLCanvasElement, private opts: SceneOptions) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const logo = samplePoints(
      { text: "D3SG", accentChars: 1, base: INK, accent: RED, alpha: [HERO_ALPHA, 0], layout: this.opts.heroLayout, maxParticles: this.opts.maxParticles, dotSize: this.opts.dotSize, repelRadius: 0 },
      this.opts.heroLayout(this.w, this.h),
      displayFamily()
    );
    const n = logo.xs.length;
    const first = this.n === 0;
    this.n = n;
    this.logoX = Float32Array.from(logo.xs);
    this.logoY = Float32Array.from(logo.ys);
    this.logoAccent = Uint8Array.from(logo.accents, (a) => (a ? 1 : 0));
    // Each dot's "dissolved" offset: a random direction well outside the shape.
    this.dirX = new Float32Array(n);
    this.dirY = new Float32Array(n);
    this.shapeAccent = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.7 + Math.random() * 1.1;
      this.dirX[i] = Math.cos(a) * r;
      this.dirY[i] = Math.sin(a) * r;
      this.shapeAccent[i] = Math.random() < 0.12 ? 1 : 0;
    }
    const kinds = this.opts.shapes ?? [...SHAPES];
    this.kinds = this.opts.gapSections.map((_, i) => kinds[i % kinds.length]!);
    this.shapes = this.kinds.map((kind) => shapePoints(kind, n));
    if (first) {
      // Start dispersed across the viewport so the logo flies in.
      this.x = Float32Array.from({ length: n }, () => Math.random() * this.w);
      this.y = Float32Array.from({ length: n }, () => Math.random() * this.h);
      this.introStart = performance.now();
    } else {
      const keep = (prev: Float32Array, fallback: () => number) => Float32Array.from({ length: n }, (_, i) => (i < prev.length ? prev[i]! : fallback()));
      this.x = keep(this.x, () => this.w / 2);
      this.y = keep(this.y, () => this.h / 2);
    }
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.level = new Uint8Array(n);
    this.cleared = false;
  }

  setPointer(x: number, y: number) {
    this.pointer.x = x;
    this.pointer.y = y;
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = (t: number) => {
      if (!this.running) return;
      this.frame(t, true);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** Reduced motion: place every dot exactly on its target, no physics or spin. */
  drawStatic() {
    this.introStart = -1e9;
    this.frame(0, false);
  }

  private boundaries() {
    return this.opts.gapSections.map((id) => document.getElementById(id)?.getBoundingClientRect().top ?? -1e6);
  }

  private frame(t: number, animate: boolean) {
    const time = t * 0.001;
    const intro = animate ? 1 - Math.min((t - this.introStart) / 1800, 1) : 0;
    const introEased = intro * intro * (3 - 2 * intro);
    const heroScroll = Math.min(Math.max(window.scrollY / (this.h * 0.75), 0), 1);
    // 1 = fully the logo, 0 = logo gone.
    const hero = 1 - Math.max(introEased * 0.999, heroScroll);
    const heroVisible = 1 - heroScroll; // the logo fades as it breaks up

    const boundaries = this.boundaries();
    const focus = gapFocus(boundaries, this.h);
    const strength = focus.strength * focus.strength * (3 - 2 * focus.strength);
    const shape = focus.index >= 0 ? this.shapes[focus.index] : undefined;
    const cx = this.w / 2;
    const cy = focus.index >= 0 ? boundaries[focus.index]! : this.h / 2;
    const scale = Math.min(this.w * (this.w < 768 ? 0.36 : 0.24), 340);
    const spread = Math.max(this.w, this.h) * 0.75;
    const rotY = animate ? time * 0.18 + window.scrollY * 0.0005 : 0.6;
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const tilt = 0.42;
    const cosX = Math.cos(tilt);
    const sinX = Math.sin(tilt);
    const isWave = this.kinds[focus.index] === "wave";

    const heroAlpha = HERO_ALPHA * heroVisible;
    const shapeAlpha = SHAPE_ALPHA * strength;
    const alpha = Math.max(heroAlpha, shapeAlpha);
    if (alpha < 0.004) {
      if (!this.cleared) {
        this.ctx.clearRect(0, 0, this.w, this.h);
        this.cleared = true;
      }
      return;
    }
    this.cleared = false;

    const { x: mx, y: my } = this.pointer;
    const r = this.opts.repelRadius;
    const r2 = r * r;
    const useHero = heroAlpha >= shapeAlpha;
    const depth = new Float32Array(useHero ? 0 : this.n);

    for (let i = 0; i < this.n; i++) {
      let tx: number;
      let ty: number;
      if (useHero) {
        // Logo, dissolving towards a wide scatter as the hero scrolls away.
        const sx = this.w / 2 + this.dirX[i]! * spread;
        const sy = this.h / 2 + this.dirY[i]! * spread;
        tx = sx + (this.logoX[i]! - sx) * hero;
        ty = sy + (this.logoY[i]! - sy) * hero;
      } else {
        let px = shape![i * 3]!;
        let py = shape![i * 3 + 1]!;
        const pz = shape![i * 3 + 2]!;
        if (isWave) py = waveHeight(px, pz, animate ? time : 0);
        // Rotate (Y then X) and project with a light perspective.
        const x1 = px * cosY + pz * sinY;
        const z1 = -px * sinY + pz * cosY;
        const y1 = py * cosX - z1 * sinX;
        const z2 = py * sinX + z1 * cosX;
        const f = 3.2 / (3.2 + z2);
        px = cx + x1 * scale * f;
        py = cy + y1 * scale * f;
        depth[i] = f;
        const sx = cx + this.dirX[i]! * spread;
        const sy = cy + this.dirY[i]! * spread;
        tx = sx + (px - sx) * strength;
        ty = sy + (py - sy) * strength;
      }

      if (!animate) {
        this.x[i] = tx;
        this.y[i] = ty;
        continue;
      }
      let vx = this.vx[i]! + (tx - this.x[i]!) * 0.06;
      let vy = this.vy[i]! + (ty - this.y[i]!) * 0.06;
      if (r > 0) {
        const dx = this.x[i]! - mx;
        const dy = this.y[i]! - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const force = (1 - d / r) * 4;
          vx += (dx / d) * force;
          vy += (dy / d) * force;
        }
      }
      vx *= 0.82;
      vy *= 0.82;
      this.vx[i] = vx;
      this.vy[i] = vy;
      this.x[i] = this.x[i]! + vx;
      this.y[i] = this.y[i]! + vy;
    }

    if (useHero) {
      // A soft diagonal light sweep every ~7s, plus a glow around the pointer.
      const period = 7;
      const sweep = ((time % period) / period) * (this.w + this.h * 0.45 + 900) - 450;
      const glowR = this.opts.repelRadius * 1.6;
      for (let i = 0; i < this.n; i++) {
        const d = this.x[i]! + this.y[i]! * 0.45 - sweep;
        let k = animate ? Math.exp(-(d * d) / (2 * 110 * 110)) : 0;
        if (glowR > 0) {
          const dx = this.x[i]! - mx;
          const dy = this.y[i]! - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < glowR) k += (1 - dist / glowR) ** 2 * 1.2;
        }
        this.level[i] = Math.min(LEVELS - 1, Math.floor(Math.min(k, 0.999) * LEVELS));
      }
    }

    const ctx = this.ctx;
    const size = this.opts.dotSize;
    const accentOf = useHero ? this.logoAccent : this.shapeAccent;
    ctx.clearRect(0, 0, this.w, this.h);
    if (useHero) {
      // Batched by colour and brightness level: base dots, then brighter,
      // slightly larger dots where the sweep or the pointer passes.
      for (const pass of [0, 1]) {
        ctx.fillStyle = pass ? RED : INK;
        for (let lvl = 0; lvl < LEVELS; lvl++) {
          const lift = lvl / (LEVELS - 1);
          const a = (HERO_ALPHA + (HERO_PEAK_ALPHA - HERO_ALPHA) * lift) * (alpha / HERO_ALPHA);
          ctx.globalAlpha = Math.min(1, pass ? a * 1.5 : a);
          const s = size * 1.12 * (1 + lift * 0.5);
          for (let i = 0; i < this.n; i++) {
            if (accentOf[i] !== pass || this.level[i] !== lvl) continue;
            ctx.fillRect(this.x[i]! - s / 2, this.y[i]! - s / 2, s, s);
          }
        }
      }
      ctx.globalAlpha = 1;
      return;
    }
    for (const pass of [0, 1]) {
      ctx.globalAlpha = pass ? Math.min(1, alpha * 1.6) : alpha;
      ctx.fillStyle = pass ? RED : INK;
      for (let i = 0; i < this.n; i++) {
        if (accentOf[i] !== pass) continue;
        // Nearer dots draw slightly larger, giving the shapes depth.
        const s = size * (0.55 + (depth[i]! - 0.7) * 1.1);
        ctx.fillRect(this.x[i]! - s / 2, this.y[i]! - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
  }
}
