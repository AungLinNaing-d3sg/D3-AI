import {
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  TubeGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createRandom } from "@/components/three/scenes/ctaCore/geometry";
import { clamp, lerp } from "@/lib/motion/mathUtils";

/**
 * Geometry for Chapter 06's background environment
 * (three/scenes/GameAmbienceScene.tsx). Everything lives in "screen-local"
 * units: the environment root faces the camera and is scaled so one unit is
 * the visible height at its depth (x spans ±aspect/2, y ±0.5); z is depth,
 * negative away from the viewer. Deterministic (seeded) so every load builds
 * the same composition.
 */

export interface Placement {
  x: number;
  y: number;
  z: number;
  /** Structure height, in screen heights. */
  size: number;
}

export interface GameLayout {
  /** The processing structure (warm) — left/back. */
  core: Placement;
  /** The network structure (cool) — right/back. */
  network: Placement;
}

/**
 * The composition, by screen shape — asymmetric, with the centre left calm
 * for the UI: the processing structure left/back and the network right/back
 * on wide screens; on narrow ones (where the UI spans the width) tucked into
 * opposite corners and partly off-canvas, a deliberate framing rather than a
 * shrunken desktop.
 */
export function layoutFor(aspect: number): GameLayout {
  if (aspect >= 1.2) {
    return {
      core: { x: -aspect * 0.37, y: -0.06, z: -0.1, size: 0.62 },
      // Upper right, clear of the site's progress rail (right, mid-height).
      network: { x: aspect * 0.4, y: 0.27, z: -0.45, size: 0.52 },
    };
  }
  if (aspect >= 0.75) {
    return {
      core: { x: -aspect * 0.44, y: 0.2, z: -0.1, size: 0.52 },
      network: { x: aspect * 0.44, y: -0.24, z: -0.4, size: 0.5 },
    };
  }
  return {
    core: { x: -aspect * 0.5, y: -0.3, z: -0.1, size: 0.42 },
    network: { x: aspect * 0.52, y: 0.3, z: -0.4, size: 0.42 },
  };
}

/* ------------------------------------------------------------------ */
/* Network                                                              */
/* ------------------------------------------------------------------ */

export interface Network {
  /** Node positions in the network's unit space (~1 tall). */
  nodes: Vector3[];
  /** One line draw: every link, with per-vertex `aT` (0 → 1 along the link)
   * and `aSeed` (per link) for the activation shader. */
  links: BufferGeometry;
}

/**
 * A distant data network: nodes on a slightly flattened, jittered
 * Fibonacci shell plus a few inner relay nodes, each linked to its nearest
 * neighbours.
 */
export function buildNetwork(count: number): Network {
  const random = createRandom(0x6e37 + count);
  const nodes: Vector3[] = [];
  const shell = Math.round(count * 0.8);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < shell; i += 1) {
    const y = 1 - (i / Math.max(shell - 1, 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * golden;
    const jitter = 0.9 + random() * 0.2;
    nodes.push(new Vector3(Math.cos(a) * r * 0.42 * jitter, y * 0.46 * jitter, Math.sin(a) * r * 0.34 * jitter));
  }
  for (let i = shell; i < count; i += 1) {
    nodes.push(new Vector3((random() - 0.5) * 0.36, (random() - 0.5) * 0.44, (random() - 0.5) * 0.26));
  }

  const positions: number[] = [];
  const along: number[] = [];
  const seeds: number[] = [];
  const seen = new Set<string>();
  nodes.forEach((node, i) => {
    nodes
      .map((other, j) => ({ j, d: j === i ? Infinity : node.distanceToSquared(other) }))
      .sort((p, q) => p.d - q.d)
      .slice(0, 3)
      .forEach(({ j }) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (seen.has(key)) return;
        seen.add(key);
        const other = nodes[j]!;
        const seed = random();
        positions.push(node.x, node.y, node.z, other.x, other.y, other.z);
        along.push(0, 1);
        seeds.push(seed, seed);
      });
  });
  const links = new BufferGeometry();
  links.setAttribute("position", new Float32BufferAttribute(positions, 3));
  links.setAttribute("aT", new Float32BufferAttribute(along, 1));
  links.setAttribute("aSeed", new Float32BufferAttribute(seeds, 1));
  return { nodes, links };
}

/* ------------------------------------------------------------------ */
/* Processing structure                                                 */
/* ------------------------------------------------------------------ */

/** Interlocking metal rings around the glass capsule: radius, tube, the
 * orientation of each ring's axis, and its (slow) spin. */
export const CORE_RINGS = [
  { radius: 0.17, tube: 0.0019, tilt: [Math.PI / 2, 0, 0], spin: 0.06 },
  { radius: 0.21, tube: 0.0016, tilt: [Math.PI / 2 - 0.5, 0.3, 0], spin: -0.045 },
  { radius: 0.25, tube: 0.0014, tilt: [0.25, 0.9, 0.15], spin: 0.035 },
  { radius: 0.3, tube: 0.0012, tilt: [Math.PI / 2 + 0.35, -0.4, 0.2], spin: -0.03 },
  { radius: 0.35, tube: 0.0011, tilt: [1.2, 1.6, -0.3], spin: 0.022 },
] as const;

/**
 * The processing structure's architectural frame, as one line draw: a tall
 * hexagonal prism cage around the capsule with three stacked hexagonal
 * decks, in the structure's unit space (~1 tall).
 */
export function buildCoreFrame(): BufferGeometry {
  const points: number[] = [];
  const hex = (radius: number, y: number, i: number) => {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    return [Math.cos(a) * radius, y, Math.sin(a) * radius] as const;
  };
  [-0.34, 0, 0.34].forEach((y, deck) => {
    const radius = deck === 1 ? 0.14 : 0.11;
    for (let i = 0; i < 6; i += 1) points.push(...hex(radius, y, i), ...hex(radius, y, i + 1));
  });
  for (let i = 0; i < 6; i += 1) points.push(...hex(0.11, -0.34, i), ...hex(0.11, 0.34, i));
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  return geometry;
}

/* ------------------------------------------------------------------ */
/* Channels and far structures (screen-local, rebuilt on aspect change) */
/* ------------------------------------------------------------------ */

export interface Channels {
  curves: CatmullRomCurve3[];
  tubes: BufferGeometry;
}

/**
 * Glass data channels from the network to the processing structure — DATA →
 * CONNECTION → PROCESSING — routed behind the UI and far back (so they read
 * small and dim), bowing through the upper and lower margins rather than
 * across the centre.
 */
export function buildChannels(layout: GameLayout, count: number): Channels {
  const { core, network } = layout;
  const routes = [
    { lift: -0.36, depth: -0.9, spread: 0.12 },
    { lift: 0.42, depth: -1.1, spread: -0.1 },
    { lift: -0.18, depth: -1.4, spread: 0.2 },
  ].slice(0, count);
  const curves = routes.map(({ lift, depth, spread }) => {
    const start = new Vector3(network.x - network.size * 0.18, network.y + spread * network.size, network.z);
    const end = new Vector3(core.x + core.size * 0.05, core.y + spread * 0.2 * core.size, core.z);
    const mid = new Vector3(lerp(start.x, end.x, 0.5), lift, depth);
    const a = new Vector3(lerp(start.x, mid.x, 0.55), lerp(start.y, lift, 0.8), lerp(start.z, depth, 0.7));
    const b = new Vector3(lerp(end.x, mid.x, 0.55), lerp(end.y, lift, 0.8), lerp(end.z, depth, 0.7));
    return new CatmullRomCurve3([start, a, mid, b, end]);
  });
  const tubes = curves.map((curve) => new TubeGeometry(curve, 96, 0.0017, 6, false));
  const merged = mergeGeometries(tubes, false) ?? new BufferGeometry();
  tubes.forEach((tube) => tube.dispose());
  return { curves, tubes: merged };
}

/**
 * Distant architecture, far behind everything and faded by depth fog:
 * tall frame outlines left and right, and a wide hexagonal frame high in
 * the back — "a large space", never detail.
 */
export function buildFarFrames(aspect: number, count: number): BufferGeometry {
  const points: number[] = [];
  const rect = (cx: number, cy: number, z: number, w: number, h: number) => {
    const c = [
      [cx - w / 2, cy - h / 2],
      [cx + w / 2, cy - h / 2],
      [cx + w / 2, cy + h / 2],
      [cx - w / 2, cy + h / 2],
    ];
    for (let i = 0; i < 4; i += 1) {
      const p = c[i]!;
      const q = c[(i + 1) % 4]!;
      points.push(p[0]!, p[1]!, z, q[0]!, q[1]!, z);
    }
  };
  const hexFrame = (cx: number, cy: number, z: number, r: number) => {
    for (let i = 0; i < 6; i += 1) {
      const a0 = (i / 6) * Math.PI * 2;
      const a1 = ((i + 1) / 6) * Math.PI * 2;
      points.push(cx + Math.cos(a0) * r * 1.6, cy + Math.sin(a0) * r * 0.5, z, cx + Math.cos(a1) * r * 1.6, cy + Math.sin(a1) * r * 0.5, z);
    }
  };
  const shapes = [
    () => rect(-aspect * 0.3, 0.02, -2.2, 0.16, 1.1),
    () => rect(aspect * 0.22, -0.04, -2.6, 0.12, 1.2),
    () => hexFrame(aspect * 0.02, 0.44, -2.4, 0.32),
    () => rect(-aspect * 0.12, -0.05, -3, 0.1, 1.25),
  ];
  shapes.slice(0, count).forEach((shape) => shape());
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  return geometry;
}

/** Point along a channel, 0 (network) → 1 (core). */
export function channelPoint(curve: CatmullRomCurve3, t: number, out: Vector3): Vector3 {
  return curve.getPointAt(clamp(t), out);
}
