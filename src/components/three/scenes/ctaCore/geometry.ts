import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  BufferGeometry,
  Euler,
  Float32BufferAttribute,
  LatheGeometry,
  QuadraticBezierCurve3,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { clamp, lerp } from "@/lib/motion/mathUtils";

/**
 * Geometry for Chapter 08's intelligence core (three/scenes/CtaScene.tsx),
 * in the core's own units: the core is centred on the origin, ~3 units from
 * floor to crown. Everything is generated deterministically from a seed, so
 * each quality tier always builds the same object.
 */

/** The crystal: an octagonal column with chamfered shoulders and flat caps,
 * where the metal collars sit. */
export const SHELL_PROFILE: [number, number][] = [
  [0, -1.18],
  [0.26, -1.18],
  [0.62, -0.82],
  [0.62, 0.82],
  [0.26, 1.18],
  [0, 1.18],
];
export const SHELL_RADIUS = 0.62;
/** The machined plinth the core levitates above, and the floor under it. */
export const PLINTH_Y = -1.56;
export const FLOOR_Y = PLINTH_Y - 0.14;
/** Top of the collar down to the floor — what the framing fits. */
const CORE_TOP = 1.3;
export const CORE_HEIGHT = CORE_TOP - FLOOR_Y;
export const CORE_CENTER_Y = (CORE_TOP + FLOOR_Y) / 2;
/** The outer gyroscope ring's diameter — the widest part of the core. */
export const CORE_WIDTH = 1.9;
export const NUCLEUS_RADIUS = 0.2;
export const PATH_SAMPLES = 24;

export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lathe(profile: [number, number][], facets: number): LatheGeometry {
  // Rotated half a facet so a flat face, not an edge, turns toward camera.
  return new LatheGeometry(
    profile.map(([r, y]) => new Vector2(r, y)),
    facets,
    Math.PI / facets,
    Math.PI * 2
  );
}

export function plateYs(count: number): number[] {
  return count >= 3 ? [-0.6, 0, 0.6] : [-0.42, 0.42];
}

/** `facets`-gon outline loops at the given heights, matching the shell's
 * facet angles — the etched bands on the glass. */
export function facetLoops(radius: number, heights: number[], facets: number): BufferGeometry {
  const points: number[] = [];
  heights.forEach((y) => {
    for (let i = 0; i < facets; i += 1) {
      const a0 = Math.PI / facets + (i / facets) * Math.PI * 2;
      const a1 = Math.PI / facets + ((i + 1) / facets) * Math.PI * 2;
      points.push(Math.sin(a0) * radius, y, Math.cos(a0) * radius, Math.sin(a1) * radius, y, Math.cos(a1) * radius);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  return geometry;
}

/* ------------------------------------------------------------------ */
/* Internal lattice                                                     */
/* ------------------------------------------------------------------ */

export interface Lattice {
  nodes: Vector3[];
  /** Per node: the story threshold at which its first path lights. */
  nodeThreshold: Float32Array;
  pathCount: number;
  /** `PATH_SAMPLES` points per path, for the data points travelling them. */
  samples: Float32Array;
  /** Per path, 0..1: the order in which the paths illuminate. */
  order: Float32Array;
  tubes: BufferGeometry;
}

/**
 * The internal architecture: nodes arranged above each plate level, each
 * linked to its nearest neighbours, and every third node linked by a
 * spiralling spoke into the nucleus. Node-to-node paths light from the
 * bottom of the core upward; the spokes into the nucleus light last — the
 * moment the separate systems are joined into one intelligence.
 */
export function buildLattice(
  nodeCount: number,
  plateCount: number,
  pathSegments: number,
  pathSides: number
): Lattice {
  const random = createRandom(0xc0de + nodeCount);
  const levels = plateYs(plateCount);
  const perLevel = Math.ceil(nodeCount / levels.length);
  const nodes: Vector3[] = [];
  for (let i = 0; i < nodeCount; i += 1) {
    const level = i % levels.length;
    const index = Math.floor(i / levels.length);
    const angle = (index / perLevel) * Math.PI * 2 + level * 0.9 + (random() - 0.5) * 0.35;
    const radius = 0.4 + random() * 0.09;
    const y = levels[level]! + 0.1 + (random() - 0.5) * 0.08;
    nodes.push(new Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius));
  }

  const edges: { a: number; b: number; spoke: boolean }[] = [];
  const seen = new Set<string>();
  nodes.forEach((node, i) => {
    const nearest = nodes
      .map((other, j) => ({ j, d: j === i ? Infinity : node.distanceToSquared(other) }))
      .sort((p, q) => p.d - q.d)
      .slice(0, 2);
    nearest.forEach(({ j }) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push({ a: i, b: j, spoke: false });
    });
    if (i % 3 === 0) edges.push({ a: i, b: -1, spoke: true });
  });

  const midY = (edge: (typeof edges)[number]) =>
    edge.spoke ? nodes[edge.a]!.y : (nodes[edge.a]!.y + nodes[edge.b]!.y) / 2;
  edges.sort((p, q) => Number(p.spoke) - Number(q.spoke) || midY(p) - midY(q));

  const pathCount = edges.length;
  const samples = new Float32Array(pathCount * PATH_SAMPLES * 3);
  const order = new Float32Array(pathCount);
  const nodeThreshold = new Float32Array(nodes.length).fill(1);
  const tubes: BufferGeometry[] = [];
  const up = new Vector3(0, 1, 0);
  const control = new Vector3();
  const end = new Vector3();
  const sample = new Vector3();

  edges.forEach((edge, p) => {
    const a = nodes[edge.a]!;
    if (edge.spoke) {
      end.copy(a).normalize().multiplyScalar(NUCLEUS_RADIUS);
      control.copy(a).multiplyScalar(0.55).applyAxisAngle(up, 0.7);
      control.y = a.y * 0.4;
    } else {
      end.copy(nodes[edge.b]!);
      control.copy(a).add(end).multiplyScalar(0.5 * 0.74);
      control.y += 0.05;
    }
    const curve = new QuadraticBezierCurve3(a.clone(), control.clone(), end.clone());
    const rank = pathCount > 1 ? p / (pathCount - 1) : 0;
    order[p] = rank;
    nodeThreshold[edge.a] = Math.min(nodeThreshold[edge.a]!, rank);
    if (!edge.spoke) nodeThreshold[edge.b] = Math.min(nodeThreshold[edge.b]!, rank);

    for (let s = 0; s < PATH_SAMPLES; s += 1) {
      curve.getPoint(s / (PATH_SAMPLES - 1), sample);
      samples.set([sample.x, sample.y, sample.z], (p * PATH_SAMPLES + s) * 3);
    }

    const tube = new TubeGeometry(curve, pathSegments, 0.0042, pathSides, false);
    tube.deleteAttribute("normal");
    const vertexCount = tube.getAttribute("position").count;
    tube.setAttribute("aOrder", new Float32BufferAttribute(new Float32Array(vertexCount).fill(rank), 1));
    tubes.push(tube);
  });

  const merged = mergeGeometries(tubes, false) ?? new BufferGeometry();
  tubes.forEach((tube) => tube.dispose());
  return { nodes, nodeThreshold, pathCount, samples, order, tubes: merged };
}

export function samplePath(samples: Float32Array, path: number, t: number, out: Vector3): Vector3 {
  const f = clamp(t) * (PATH_SAMPLES - 1);
  const i = Math.min(Math.floor(f), PATH_SAMPLES - 2);
  const k = f - i;
  const o = (path * PATH_SAMPLES + i) * 3;
  return out.set(
    lerp(samples[o]!, samples[o + 3]!, k),
    lerp(samples[o + 1]!, samples[o + 4]!, k),
    lerp(samples[o + 2]!, samples[o + 5]!, k)
  );
}

/* ------------------------------------------------------------------ */
/* Supporting structures behind the core                               */
/* ------------------------------------------------------------------ */

export interface BackdropArc {
  radius: number;
  start: number;
  end: number;
  rotation: Euler;
  centre: Vector3;
}

export interface BackdropPanel {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
}

export interface Backdrop {
  /** Frames, arcs and their tick marks — one line draw. */
  lines: BufferGeometry;
  /** Faint link lines from distant nodes toward the core — lit on connect. */
  links: BufferGeometry;
  /** Small data nodes along the frames and arcs. */
  nodes: Vector3[];
  arcs: BackdropArc[];
  panels: BackdropPanel[];
}

export interface BackdropTier {
  frames: number;
  arcs: number;
  panels: number;
  links: number;
}

export function arcPoint(arc: BackdropArc, t: number, out: Vector3): Vector3 {
  const angle = lerp(arc.start, arc.end, t);
  return out.set(Math.cos(angle) * arc.radius, Math.sin(angle) * arc.radius, 0).applyEuler(arc.rotation).add(arc.centre);
}

const ARCS: BackdropArc[] = [
  { radius: 1.65, start: -0.35 * Math.PI, end: 0.9 * Math.PI, rotation: new Euler(1.18, 0.1, 0.12), centre: new Vector3(0, 0.1, -0.5) },
  { radius: 2.2, start: 0.45 * Math.PI, end: 1.55 * Math.PI, rotation: new Euler(-0.32, -0.25, 0.22), centre: new Vector3(0, 0, -1.6) },
];

const PANELS: BackdropPanel[] = [
  { position: [1.55, 0.45, -1.6], rotation: [0, -0.55, 0], size: [0.5, 1.7] },
  { position: [-1.3, 0.25, -2.1], rotation: [0, 0.6, 0], size: [0.6, 2] },
  { position: [0.7, -1.05, -2.6], rotation: [-0.2, -0.3, 0], size: [1.1, 0.42] },
];

/**
 * The supporting structures that sit far behind the core and make the space
 * read as larger than one object: precision octagonal frames (echoing the
 * core's facets, doubled like a machined bezel), two technical arcs with
 * fine tick marks, a few thin glass panels, data nodes at the frame and arc
 * ends, and faint link lines from those nodes toward the core.
 */
export function buildBackdrop(tier: BackdropTier): Backdrop {
  const lines: number[] = [];
  const nodes: Vector3[] = [];
  const point = new Vector3();
  const next = new Vector3();

  const frames = [
    { radius: 1.9, z: -1.3, tilt: new Euler(0.12, 0.28, Math.PI / 8) },
    { radius: 2.5, z: -2.6, tilt: new Euler(-0.08, -0.2, Math.PI / 8 + 0.18) },
  ].slice(0, tier.frames);
  frames.forEach(({ radius, z, tilt }) => {
    [radius, radius * 1.018].forEach((r, ring) => {
      for (let i = 0; i < 8; i += 1) {
        const a0 = (i / 8) * Math.PI * 2;
        const a1 = ((i + 1) / 8) * Math.PI * 2;
        point.set(Math.cos(a0) * r, Math.sin(a0) * r * 1.12, 0).applyEuler(tilt);
        next.set(Math.cos(a1) * r, Math.sin(a1) * r * 1.12, 0).applyEuler(tilt);
        lines.push(point.x, point.y, point.z + z, next.x, next.y, next.z + z);
        if (ring === 0 && i % 2 === 0) nodes.push(point.clone().setZ(point.z + z));
      }
    });
  });

  const arcs = ARCS.slice(0, tier.arcs);
  arcs.forEach((arc, index) => {
    const steps = 96;
    for (let s = 0; s < steps; s += 1) {
      arcPoint(arc, s / steps, point);
      arcPoint(arc, (s + 1) / steps, next);
      lines.push(point.x, point.y, point.z, next.x, next.y, next.z);
    }
    // Fine tick marks along the outer arc.
    if (index === 1) {
      const ticks = 42;
      for (let s = 0; s <= ticks; s += 1) {
        const t = s / ticks;
        const inner = { ...arc, radius: arc.radius * (s % 6 === 0 ? 0.965 : 0.982) };
        arcPoint(arc, t, point);
        arcPoint(inner, t, next);
        lines.push(point.x, point.y, point.z, next.x, next.y, next.z);
      }
    }
    nodes.push(arcPoint(arc, 0, new Vector3()), arcPoint(arc, 1, new Vector3()), arcPoint(arc, 0.5, new Vector3()));
  });

  const links: number[] = [];
  nodes.slice(0, tier.links).forEach((node) => {
    const toward = node.clone().normalize().multiplyScalar(1.05);
    links.push(node.x, node.y, node.z, toward.x, toward.y, toward.z);
  });

  const lineGeometry = new BufferGeometry();
  lineGeometry.setAttribute("position", new Float32BufferAttribute(lines, 3));
  const linkGeometry = new BufferGeometry();
  linkGeometry.setAttribute("position", new Float32BufferAttribute(links, 3));
  return { lines: lineGeometry, links: linkGeometry, nodes, arcs, panels: PANELS.slice(0, tier.panels) };
}
