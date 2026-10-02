/**
 * Abstract geometric point clouds for the background particle field, plus
 * the "which gap is in focus" calculation that decides when they appear.
 * Pure functions (no DOM), so they are unit-tested directly.
 */

export const SHAPES = ["sphere", "torus", "wave", "helix", "cube"] as const;
export type ShapeKind = (typeof SHAPES)[number];

/** Deterministic PRNG so shapes look the same on every load. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * `n` points (x, y, z interleaved) on the surface of the shape, all within a
 * unit-ish radius (|coord| ≤ 1.35) around the origin.
 */
export function shapePoints(kind: ShapeKind, n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const rand = rng(SHAPES.indexOf(kind) * 7919 + 17);
  const set = (i: number, x: number, y: number, z: number) => {
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  };
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    switch (kind) {
      case "sphere": {
        // Fibonacci lattice: even coverage, reads as a clean globe.
        const y = 1 - 2 * t;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const a = golden * i;
        set(i, Math.cos(a) * r, y, Math.sin(a) * r);
        break;
      }
      case "torus": {
        const u = rand() * Math.PI * 2;
        const v = rand() * Math.PI * 2;
        const R = 0.95;
        const r = 0.36;
        set(i, (R + r * Math.cos(v)) * Math.cos(u), r * Math.sin(v), (R + r * Math.cos(v)) * Math.sin(u));
        break;
      }
      case "wave": {
        // Flat lattice; the height is animated at projection time.
        const side = Math.ceil(Math.sqrt(n));
        const gx = (i % side) / (side - 1 || 1);
        const gz = Math.floor(i / side) / (side - 1 || 1);
        set(i, (gx - 0.5) * 2, 0, (gz - 0.5) * 2);
        break;
      }
      case "helix": {
        // Two strands plus rungs, like a double helix.
        const strand = i % 3;
        const h = t * 2.4 - 1.2;
        const a = t * Math.PI * 6;
        if (strand < 2) {
          const off = strand * Math.PI;
          set(i, Math.cos(a + off) * 0.55, h, Math.sin(a + off) * 0.55);
        } else {
          const k = rand() * 2 - 1;
          set(i, Math.cos(a) * 0.55 * k, h, Math.sin(a) * 0.55 * k);
        }
        break;
      }
      case "cube": {
        // Points on the six faces, denser along the edges.
        const face = Math.floor(rand() * 6);
        let a = rand() * 2 - 1;
        let b = rand() * 2 - 1;
        if (rand() < 0.45) {
          if (rand() < 0.5) a = Math.sign(a) || 1;
          else b = Math.sign(b) || 1;
        }
        const s = 0.82;
        const sign = face % 2 ? 1 : -1;
        if (face < 2) set(i, sign * s, a * s, b * s);
        else if (face < 4) set(i, a * s, sign * s, b * s);
        else set(i, a * s, b * s, sign * s);
        break;
      }
    }
  }
  return out;
}

/** Height of the animated wave lattice at (x, z) and time `t` (seconds). */
export function waveHeight(x: number, z: number, t: number) {
  return Math.sin(x * 2.4 + t * 1.1) * 0.18 + Math.cos(z * 2.1 + t * 0.8) * 0.14;
}

/**
 * Which section boundary is closest to the middle of the screen, and how
 * strongly to show its shape: 1 when the boundary sits exactly at mid-screen,
 * fading to 0 by `reach` (fraction of the viewport height) either side.
 * `boundaries` are viewport-relative Y positions, in page order.
 */
export function gapFocus(boundaries: number[], viewportHeight: number, reach = 0.42) {
  let index = -1;
  let strength = 0;
  const mid = viewportHeight / 2;
  boundaries.forEach((y, i) => {
    const s = Math.max(0, 1 - Math.abs(y - mid) / (viewportHeight * reach));
    if (s > strength) {
      strength = s;
      index = i;
    }
  });
  return { index, strength };
}
