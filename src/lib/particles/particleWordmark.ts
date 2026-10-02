/**
 * Canvas-2D particle wordmark: samples text (in the site's display face) into
 * dots that spring towards their place in the letters, scatter into a calm
 * drifting field, and push away from the pointer.
 *
 * `scatter` 0 = assembled wordmark, 1 = fully dispersed ambient field. The
 * hero drives it from scroll; the footer animates it in when visible.
 * No WebGL / three.js: a few thousand `fillRect`s per frame is cheap.
 */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WordmarkOptions {
  text: string;
  /** How many leading characters use the accent colour (the red "D"). */
  accentChars: number;
  base: string;
  accent: string;
  /** Opacity of the assembled letters / of the dispersed field. */
  alpha: [assembled: number, dispersed: number];
  /** Where the letters sit inside a canvas of the given CSS size. */
  layout: (width: number, height: number) => Box;
  /** Upper bound; the sampling grid widens until it fits. */
  maxParticles: number;
  dotSize: number;
  /** Pointer repulsion radius in CSS px (0 disables). */
  repelRadius: number;
}

const TAU = Math.PI * 2;

function displayFamily(): string {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-sans-display").trim();
  return family || "sans-serif";
}

/** Rasterise the text off-screen and return dot positions + accent flags. */
function samplePoints(opts: WordmarkOptions, box: Box, family: string) {
  const width = Math.max(1, Math.ceil(box.w));
  const height = Math.max(1, Math.ceil(box.h));
  const off = document.createElement("canvas");
  off.width = width;
  off.height = height;
  const ctx = off.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { xs: [] as number[], ys: [] as number[], accents: [] as boolean[] };

  ctx.font = `400 100px ${family}`;
  const probe = ctx.measureText(opts.text);
  const probeH = (probe.actualBoundingBoxAscent + probe.actualBoundingBoxDescent) || 72;
  const size = Math.min((100 * width) / probe.width, (100 * height * 0.96) / probeH);
  ctx.font = `400 ${size}px ${family}`;
  ctx.textBaseline = "alphabetic";
  const metrics = ctx.measureText(opts.text);
  let x = (width - metrics.width) / 2;
  const y = (height + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
  [...opts.text].forEach((char, i) => {
    ctx.fillStyle = i < opts.accentChars ? "#ff0000" : "#0000ff";
    ctx.fillText(char, x, y);
    x += ctx.measureText(char).width;
  });

  const { data } = ctx.getImageData(0, 0, width, height);
  const filled = (gap: number) => {
    let count = 0;
    for (let py = 0; py < height; py += gap) for (let px = 0; px < width; px += gap) if ((data[(py * width + px) * 4 + 3] ?? 0) > 128) count++;
    return count;
  };
  let gap = 3;
  while (filled(gap) > opts.maxParticles) gap += 1;

  const xs: number[] = [];
  const ys: number[] = [];
  const accents: boolean[] = [];
  for (let py = 0; py < height; py += gap) {
    for (let px = 0; px < width; px += gap) {
      const i = (py * width + px) * 4;
      if ((data[i + 3] ?? 0) <= 128) continue;
      xs.push(box.x + px);
      ys.push(box.y + py);
      accents.push((data[i] ?? 0) > (data[i + 2] ?? 0));
    }
  }
  return { xs, ys, accents };
}

export class ParticleWordmark {
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private count = 0;
  private x = new Float32Array(0);
  private y = new Float32Array(0);
  private vx = new Float32Array(0);
  private vy = new Float32Array(0);
  private hx = new Float32Array(0);
  private hy = new Float32Array(0);
  private ax = new Float32Array(0);
  private ay = new Float32Array(0);
  private seed = new Float32Array(0);
  private accent = new Uint8Array(0);
  private raf = 0;
  private running = false;
  private pointer = { x: -9999, y: -9999 };
  private tween: { from: number; to: number; start: number; ms: number } | null = null;
  scatter = 1;

  constructor(private canvas: HTMLCanvasElement, private opts: WordmarkOptions) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
  }

  /** (Re)measure the canvas and resample the letters. */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const { xs, ys, accents } = samplePoints(this.opts, this.opts.layout(this.width, this.height), displayFamily());
    const fresh = this.count === 0;
    const n = xs.length;
    const keep = (prev: Float32Array, fill: (i: number) => number) => {
      const next = new Float32Array(n);
      for (let i = 0; i < n; i++) next[i] = !fresh && i < prev.length ? prev[i]! : fill(i);
      return next;
    };
    this.hx = Float32Array.from(xs);
    this.hy = Float32Array.from(ys);
    this.accent = Uint8Array.from(accents, (a) => (a ? 1 : 0));
    this.ax = Float32Array.from({ length: n }, () => Math.random() * this.width);
    this.ay = Float32Array.from({ length: n }, () => Math.random() * this.height);
    this.seed = Float32Array.from({ length: n }, () => Math.random() * TAU);
    // Start each dot at its dispersed position so the first assembly flies in.
    this.x = keep(this.x, (i) => this.ax[i]!);
    this.y = keep(this.y, (i) => this.ay[i]!);
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.count = n;
  }

  setPointer(x: number, y: number) {
    this.pointer.x = x;
    this.pointer.y = y;
  }

  /** Ease `scatter` to `to` over `ms`. */
  animateScatter(to: number, ms: number) {
    this.tween = { from: this.scatter, to, start: performance.now(), ms };
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = (t: number) => {
      if (!this.running) return;
      this.step(t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** Draw one frame with every dot exactly on its target (reduced motion). */
  drawStatic(scatter: number) {
    this.scatter = scatter;
    for (let i = 0; i < this.count; i++) {
      this.x[i] = this.hx[i]! + (this.ax[i]! - this.hx[i]!) * scatter;
      this.y[i] = this.hy[i]! + (this.ay[i]! - this.hy[i]!) * scatter;
    }
    this.draw();
  }

  private step(t: number) {
    if (this.tween) {
      const k = Math.min((t - this.tween.start) / this.tween.ms, 1);
      const eased = 1 - Math.pow(1 - k, 3);
      this.scatter = this.tween.from + (this.tween.to - this.tween.from) * eased;
      if (k >= 1) this.tween = null;
    }
    const p = this.scatter;
    const time = t * 0.001;
    const { x: mx, y: my } = this.pointer;
    const r = this.opts.repelRadius;
    const r2 = r * r;

    for (let i = 0; i < this.count; i++) {
      const s = this.seed[i]!;
      // Dispersed dots drift slowly; assembled dots shimmer by a pixel.
      const ax = this.ax[i]! + Math.sin(time * 0.25 + s) * 22;
      const ay = this.ay[i]! + Math.cos(time * 0.2 + s * 1.3) * 18;
      const hx = this.hx[i]! + Math.sin(time * 1.4 + s) * 0.6;
      const hy = this.hy[i]! + Math.cos(time * 1.2 + s) * 0.6;
      const tx = hx + (ax - hx) * p;
      const ty = hy + (ay - hy) * p;

      let vx = this.vx[i]! + (tx - this.x[i]!) * 0.055;
      let vy = this.vy[i]! + (ty - this.y[i]!) * 0.055;
      if (r > 0) {
        const dx = this.x[i]! - mx;
        const dy = this.y[i]! - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const force = (1 - d / r) * 4.2;
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
    this.draw();
  }

  private draw() {
    const { ctx } = this;
    const [assembled, dispersed] = this.opts.alpha;
    const alpha = assembled + (dispersed - assembled) * this.scatter;
    const size = this.opts.dotSize;
    ctx.clearRect(0, 0, this.width, this.height);
    for (const accentPass of [0, 1]) {
      ctx.globalAlpha = accentPass ? Math.min(1, alpha * 1.6) : alpha;
      ctx.fillStyle = accentPass ? this.opts.accent : this.opts.base;
      for (let i = 0; i < this.count; i++) {
        if (this.accent[i] !== accentPass) continue;
        ctx.fillRect(this.x[i]! - size / 2, this.y[i]! - size / 2, size, size);
      }
    }
    ctx.globalAlpha = 1;
  }
}

/** False where 2D canvas is unavailable (jsdom, locked-down browsers). */
export function canvas2dSupported() {
  try {
    return !!document.createElement("canvas").getContext("2d");
  } catch {
    return false;
  }
}

/** Resolve once the display webfont is ready, so letters sample correctly. */
export async function displayFontReady() {
  try {
    await document.fonts?.load(`400 100px ${displayFamily()}`);
    await document.fonts?.ready;
  } catch {
    /* fall back to whatever face is available */
  }
}
