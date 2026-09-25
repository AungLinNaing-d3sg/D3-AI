"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  BackSide,
  BoxGeometry,
  Color,
  EdgesGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PlaneGeometry,
  PMREMGenerator,
  RingGeometry,
  TorusGeometry,
  Vector3,
  type BufferAttribute,
  type Camera,
  type Group,
  type PerspectiveCamera,
  type PointLight,
  type Points,
  type WebGLRenderer,
} from "three";
import {
  arcPoint,
  buildBackdrop,
  buildLattice,
  CORE_CENTER_Y,
  CORE_HEIGHT,
  CORE_WIDTH,
  createRandom,
  facetLoops,
  FLOOR_Y,
  lathe,
  NUCLEUS_RADIUS,
  PLINTH_Y,
  plateYs,
  samplePath,
  SHELL_PROFILE,
  SHELL_RADIUS,
} from "@/components/three/scenes/ctaCore/geometry";
import {
  buildStudio,
  createEnvironment,
  createFloor,
  createGlowPoints,
  createPathMaterial,
  createShieldUniforms,
  createStructureMaterial,
  orangeOf,
  withShield,
} from "@/components/three/scenes/ctaCore/materials";
import { ctaStory, ctaStoryPhases, type CtaStoryPhases } from "@/lib/motion/ctaStory";
import { journeyState } from "@/lib/motion/journeyState";
import { clamp, damp, lerp, smoothstep } from "@/lib/motion/mathUtils";
import type { SceneQuality } from "@/lib/three/deviceTiers";
import { getThemeColors } from "@/lib/three/themeColors";

interface CtaSceneProps {
  quality: SceneQuality;
  /**
   * Static presentation for reduced-motion visitors, rendered in its own
   * on-demand canvas covering the section (components/three/CtaStillCanvas.tsx):
   * the core in its settled, fully-connected state, with no drift, travel,
   * parallax or rotation.
   */
  still?: boolean;
}

/** Section 8, the box inside its background layer that the core is framed
 * into (components/sections/CtaStage.tsx), and the foreground content. The
 * shared canvas is fixed behind the page, so the core is placed into the
 * anchor's on-screen rect every frame (on desktop the anchor itself is held
 * in frame while the form scrolls past — see CtaStage's `useCtaStory`);
 * whatever of the scene passes behind the content is dimmed. */
const SECTION_SELECTOR = "#cta";
const ANCHOR_SELECTOR = "[data-cta-anchor]";
const CONTENT_SELECTOR = "[data-cta-content]";

interface CoreTier {
  /** Radial facets of the crystal shell, plinth and plates. */
  facets: number;
  /** Internal lattice nodes; the data paths are derived from them. */
  nodes: number;
  /** Stacked internal plates. */
  plates: number;
  /** Gyroscope rings around the shell (middle layer). */
  rings: number;
  /** Data points that converge from the environment onto the paths. */
  particles: number;
  /** Inner data streams spiralling into the nucleus. */
  streams: number;
  /** Fine dust in the volume around the core. */
  dust: number;
  /** Distant, large, blurred motes far behind the core. */
  haze: number;
  /** Supporting structures far behind the core. */
  backdrop: { frames: number; arcs: number; panels: number; links: number; travellers: number };
  /** Data path tube resolution: segments along, sides around. */
  pathSegments: number;
  pathSides: number;
  /** Real refraction through the shell (an extra transmission pass). */
  transmission: boolean;
  motionScale: number;
  pointer: boolean;
  /** How strongly the scene is subdued behind the content (0..1). */
  contentShield: number;
  /** Overall intensity of lights and atmosphere. */
  intensity: number;
  /** Core size as a fraction of the anchor. */
  fit: number;
}

export const CTA_TIERS: Record<SceneQuality, CoreTier> = {
  high: {
    facets: 8,
    nodes: 18,
    plates: 3,
    rings: 2,
    particles: 220,
    streams: 90,
    dust: 90,
    haze: 22,
    backdrop: { frames: 2, arcs: 2, panels: 3, links: 4, travellers: 18 },
    pathSegments: 40,
    pathSides: 5,
    transmission: true,
    motionScale: 1,
    pointer: true,
    contentShield: 0.82,
    intensity: 1,
    fit: 0.9,
  },
  medium: {
    facets: 8,
    nodes: 13,
    plates: 3,
    rings: 2,
    particles: 130,
    streams: 56,
    dust: 50,
    haze: 12,
    backdrop: { frames: 1, arcs: 2, panels: 1, links: 3, travellers: 10 },
    pathSegments: 28,
    pathSides: 4,
    transmission: true,
    motionScale: 0.75,
    pointer: true,
    contentShield: 0.86,
    intensity: 0.9,
    fit: 0.9,
  },
  low: {
    facets: 6,
    nodes: 8,
    plates: 2,
    rings: 1,
    particles: 64,
    streams: 28,
    dust: 24,
    haze: 6,
    backdrop: { frames: 1, arcs: 1, panels: 0, links: 2, travellers: 5 },
    pathSegments: 18,
    pathSides: 3,
    transmission: false,
    motionScale: 0.5,
    pointer: false,
    contentShield: 0.9,
    intensity: 0.8,
    fit: 0.94,
  },
};

/** Gyroscope rings: radius, tube, loose tilt, locked orientation, spin. */
const RINGS = [
  { radius: 0.84, tube: 0.0055, loose: [0.55, 0.2, 0.3], locked: [Math.PI / 2, 0, 0], spin: 0.32 },
  { radius: 0.94, tube: 0.0045, loose: [0.2, -0.6, -0.45], locked: [Math.PI / 2 - 0.42, 0, 0.3], spin: -0.22 },
] as const;
const BEADS_PER_RING = 3;

/* ------------------------------------------------------------------ */
/* Placement helpers                                                    */
/* ------------------------------------------------------------------ */

const viewPoint = new Vector3();
const tint = new Color();
const pathPoint = new Vector3();
const corePoint = new Vector3();
const scratchMatrix = new Matrix4();
const scratchObject = new Object3D();

/** World point at depth `z` under normalised-device coordinates. */
function worldAtDepth(ndcX: number, ndcY: number, z: number, camera: Camera, out: Vector3): Vector3 {
  out.set(ndcX, ndcY, 0.5).unproject(camera);
  out.sub(camera.position).normalize();
  const distance = (z - camera.position.z) / (Math.abs(out.z) < 1e-4 ? -1e-4 : out.z);
  return out.multiplyScalar(distance).add(camera.position);
}

function fovOf(camera: Camera): number {
  return "fov" in camera ? (camera as PerspectiveCamera).fov : 38;
}

/** Visible frustum height at a world point, along the view axis. */
function visibleHeightAt(point: Vector3, camera: Camera): number {
  viewPoint.copy(point).applyMatrix4(camera.matrixWorldInverse);
  return 2 * Math.tan((fovOf(camera) * Math.PI) / 360) * Math.max(-viewPoint.z, 0.1);
}

function pointBuffers(count: number) {
  return {
    count,
    positions: new Float32Array(count * 3),
    colors: new Float32Array(count * 3),
    sizes: new Float32Array(count),
  };
}

function markDirty(points: Points | null) {
  const geometry = points?.geometry;
  if (!geometry) return;
  (geometry.getAttribute("position") as BufferAttribute).needsUpdate = true;
  (geometry.getAttribute("aColor") as BufferAttribute).needsUpdate = true;
}

/**
 * Chapter 08 — the AI Intelligence Core: a physical, engineered system in a
 * dark technology studio, underneath and beside the content, in layers:
 *
 * - Environment (screen space): graphite/midnight foundation, cyan and
 *   violet depth light, haze, depth fog and warm light from the core.
 * - Atmosphere: distant blurred motes and fine dust, lit warm near the core.
 * - Supporting structures, far behind and moving slower than the core:
 *   precision frames, technical arcs, thin glass panels, data nodes with
 *   points travelling the arcs, and faint links toward the core — all lit by
 *   the core's own light falloff.
 * - The core, in three layers — outer: a faceted glass shell (real
 *   refraction on desktop/tablet) with an inner glass layer, etched lines,
 *   dark machined collars and band, turning very slowly; middle: thin metal
 *   gyroscope rings with moving beads, stacked metal plates, a lattice of
 *   nodes and data paths; inner: a faceted nucleus in a fine cage, data
 *   streams spiralling into it, and its orange light — a real light that
 *   lights the plates, rings, plinth and floor.
 *
 * Scroll story (`ctaStory`), fully reversible: ENTER — the environment
 * comes up, the core emerges from depth, dormant; CONNECT — scattered data
 * converges, paths light in sequence, the rings start turning; INTELLIGENCE
 * — plates and rings lock into alignment, the streams run, energy
 * concentrates, the view closes in, reflections strengthen; COMPLETE — the
 * motion calms and the core steps back a touch so the CTA leads. Motion
 * speeds are integrated over time (`motion.clock`/`flow`/`spin`), so a
 * change of pace never makes anything jump.
 *
 * Content-safe: behind the HTML content everything is dimmed, desaturated,
 * thinned out and defocused in the shaders. Goes idle (hidden, no
 * per-frame work) whenever the section is off screen.
 */
export function CtaScene({ quality, still = false }: CtaSceneProps) {
  const tier = CTA_TIERS[quality];
  const gl = useThree((state) => state.gl) as WebGLRenderer | undefined;
  const theme = useMemo(() => getThemeColors(), []);

  const rootRef = useRef<Group>(null);
  const coreRef = useRef<Group>(null);
  const shellRef = useRef<Group>(null);
  const latticeRef = useRef<Group>(null);
  const nucleusRef = useRef<Group>(null);
  const cageRef = useRef<Group>(null);
  const plateRefs = useRef<(Group | null)[]>([]);
  const ringRefs = useRef<(Group | null)[]>([]);
  const backdropRef = useRef<Group>(null);
  const environmentRef = useRef<Mesh>(null);
  const hazeRef = useRef<Points>(null);
  const dustRef = useRef<Points>(null);
  const particlesRef = useRef<Points>(null);
  const streamsRef = useRef<Points>(null);
  const halosRef = useRef<Points>(null);
  const backNodesRef = useRef<Points>(null);
  const keyLightRef = useRef<PointLight>(null);
  const fillLightRef = useRef<PointLight>(null);
  const rimLightRef = useRef<PointLight>(null);
  const coreLightRef = useRef<PointLight>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);

  const motion = useRef({ story: still ? 1 : 0, tiltX: 0, tiltY: 0, clock: 0, flow: 0, spin: 0 });
  const phases = useRef<CtaStoryPhases>({ wake: 0, converge: 0, connect: 0, organize: 0, energy: 0, complete: 0 });

  /* ---- shared uniforms and materials ---- */

  const shield = useMemo(() => createShieldUniforms(theme), [theme]);

  const materials = useMemo(() => {
    const glass = withShield(
      new MeshPhysicalMaterial({
        color: theme.ink50.clone().lerp(orangeOf(theme.brand300), 0.06),
        metalness: 0,
        roughness: 0.1,
        ior: 1.48,
        specularIntensity: 1,
        clearcoat: 0.8,
        clearcoatRoughness: 0.06,
        flatShading: true,
        envMapIntensity: 1,
        depthWrite: false,
        ...(tier.transmission
          ? {
              transmission: 1,
              thickness: 0.45,
              attenuationColor: orangeOf(theme.brand300).lerp(theme.ink50, 0.55),
              attenuationDistance: 3,
            }
          : { transparent: true, opacity: 0.16 }),
      }),
      shield,
      tier.transmission ? "glass-transmission" : "glass",
      true
    );
    const innerGlass = withShield(
      new MeshPhysicalMaterial({
        color: theme.ink100.clone(),
        metalness: 0,
        roughness: 0.18,
        flatShading: true,
        transparent: true,
        opacity: 0.1,
        side: BackSide,
        depthWrite: false,
        envMapIntensity: 0.8,
      }),
      shield,
      "glass-inner"
    );
    const metal = withShield(
      new MeshPhysicalMaterial({
        color: theme.ink700.clone().lerp(theme.ink500, 0.25),
        metalness: 0.9,
        roughness: 0.38,
        clearcoat: 0.35,
        clearcoatRoughness: 0.3,
        flatShading: true,
        envMapIntensity: 1,
      }),
      shield,
      "metal",
      true
    );
    const plateMetal = withShield(
      new MeshPhysicalMaterial({
        color: theme.ink500.clone().lerp(theme.ink300, 0.3),
        metalness: 0.85,
        roughness: 0.3,
        clearcoat: 0.4,
        clearcoatRoughness: 0.2,
        flatShading: true,
        envMapIntensity: 1,
      }),
      shield,
      "metal-plate",
      true
    );
    const brightMetal = withShield(
      new MeshPhysicalMaterial({
        color: theme.ink300.clone(),
        metalness: 1,
        roughness: 0.22,
        envMapIntensity: 1.2,
      }),
      shield,
      "metal-bright",
      true
    );
    const nucleus = withShield(
      new MeshStandardMaterial({
        color: theme.ink800.clone(),
        metalness: 0.6,
        roughness: 0.25,
        emissive: orangeOf(theme.brand400),
        emissiveIntensity: 0.2,
        flatShading: true,
      }),
      shield,
      "nucleus"
    );
    const seam = withShield(
      new MeshBasicMaterial({ color: orangeOf(theme.brand400), transparent: true, opacity: 0.2, depthWrite: false }),
      shield,
      "seam"
    );
    const etch = withShield(
      new LineBasicMaterial({ color: theme.ink100.clone(), transparent: true, opacity: 0.12, depthWrite: false }),
      shield,
      "etch"
    );
    const cage = withShield(
      new LineBasicMaterial({ color: theme.ink300.clone(), transparent: true, opacity: 0.3, depthWrite: false }),
      shield,
      "cage"
    );
    return { glass, innerGlass, metal, plateMetal, brightMetal, nucleus, seam, etch, cage };
  }, [theme, tier, shield]);
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);

  const shaders = useMemo(
    () => ({
      environment: createEnvironment(theme, shield),
      floor: createFloor(theme, shield),
      paths: createPathMaterial(theme, shield),
      particles: createGlowPoints(shield, 3.2),
      streams: createGlowPoints(shield, 3.6),
      halos: createGlowPoints(shield, 4.5),
      dust: createGlowPoints(shield, 2.6),
      haze: createGlowPoints(shield, 1.6),
      backNodes: createGlowPoints(shield, 3),
      structure: createStructureMaterial(theme, shield, false),
      links: createStructureMaterial(theme, shield, false),
      panel: createStructureMaterial(theme, shield, true),
    }),
    [theme, shield]
  );
  useEffect(() => () => Object.values(shaders).forEach((material) => material.dispose()), [shaders]);

  const envTarget = useMemo(() => {
    if (!gl || typeof gl.getContext !== "function") return null;
    const pmrem = new PMREMGenerator(gl);
    const studio = buildStudio(theme);
    const target = pmrem.fromScene(studio, 0.04);
    studio.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        (object.material as MeshBasicMaterial).dispose();
      }
    });
    pmrem.dispose();
    return target;
  }, [gl, theme]);
  const reflective = useMemo(
    () => [
      materials.glass,
      materials.innerGlass,
      materials.metal,
      materials.plateMetal,
      materials.brightMetal,
      materials.nucleus,
    ],
    [materials]
  );
  useEffect(() => {
    reflective.forEach((material) => {
      material.envMap = envTarget?.texture ?? null;
      material.needsUpdate = true;
    });
    return () => envTarget?.dispose();
  }, [envTarget, reflective]);

  /* ---- geometry ---- */

  const geometry = useMemo(() => {
    const shell = lathe(SHELL_PROFILE, tier.facets);
    const etchLines = new EdgesGeometry(shell, 20);
    const bands = facetLoops(SHELL_RADIUS * 1.002, [-0.5, -0.46, 0.46, 0.5], tier.facets);
    const etch = mergeGeometries([etchLines, bands], false) ?? etchLines;
    if (etch !== etchLines) etchLines.dispose();
    bands.dispose();
    const collar = lathe(
      [
        [0, 1.16],
        [0.31, 1.16],
        [0.31, 1.25],
        [0.24, 1.3],
        [0, 1.3],
      ],
      tier.facets
    );
    const band = lathe(
      [
        [0.618, -0.018],
        [0.64, -0.018],
        [0.645, 0],
        [0.64, 0.018],
        [0.618, 0.018],
      ],
      tier.facets
    );
    const plinth = lathe(
      [
        [0, -0.14],
        [0.71, -0.14],
        [0.76, -0.1],
        [0.76, 0.05],
        [0.72, 0.1],
        [0.58, 0.1],
        [0.56, 0.07],
        [0, 0.07],
      ],
      tier.facets
    );
    const plate = lathe(
      [
        [0.3, -0.014],
        [0.455, -0.014],
        [0.47, 0],
        [0.455, 0.014],
        [0.3, 0.014],
        [0.3, -0.014],
      ],
      tier.facets
    );
    // Ring angles run the other way round from the lathe's once laid flat,
    // so this start lines their corners up with the facets.
    const ringStart = Math.PI / tier.facets - Math.PI / 2;
    const plateSeam = new RingGeometry(0.29, 0.305, tier.facets, 1, ringStart);
    const plinthSeam = new RingGeometry(0.565, 0.58, tier.facets, 1, ringStart);
    const nucleus = new OctahedronGeometry(0.13, 0);
    const icosahedron = new IcosahedronGeometry(0.23, 0);
    const cage = new EdgesGeometry(icosahedron);
    icosahedron.dispose();
    const node = new OctahedronGeometry(0.024, 0);
    const bead = new OctahedronGeometry(0.02, 0);
    const stud = new BoxGeometry(0.018, 0.05, 0.014);
    const floor = new PlaneGeometry(8, 6);
    const panel = new PlaneGeometry(1, 1);
    const rings = RINGS.slice(0, tier.rings).map((ring) => new TorusGeometry(ring.radius, ring.tube, 6, 180));
    return {
      shell,
      etch,
      collar,
      band,
      plinth,
      plate,
      plateSeam,
      plinthSeam,
      nucleus,
      cage,
      node,
      bead,
      stud,
      floor,
      panel,
      rings,
    };
  }, [tier]);
  useEffect(
    () => () =>
      Object.values(geometry).forEach((g) => (Array.isArray(g) ? g.forEach((item) => item.dispose()) : g.dispose())),
    [geometry]
  );

  const lattice = useMemo(
    () => buildLattice(tier.nodes, tier.plates, tier.pathSegments, tier.pathSides),
    [tier]
  );
  useEffect(() => () => lattice.tubes.dispose(), [lattice]);

  const backdrop = useMemo(() => buildBackdrop(tier.backdrop), [tier]);
  useEffect(
    () => () => {
      backdrop.lines.dispose();
      backdrop.links.dispose();
    },
    [backdrop]
  );

  const plates = useMemo(() => {
    const random = createRandom(0x91a7 + tier.plates);
    return plateYs(tier.plates).map((y, i) => ({
      y,
      spin: (0.012 + random() * 0.018) * (i % 2 === 0 ? 1 : -1),
      phase: random() * Math.PI * 2,
      tiltX: (random() - 0.5) * 0.7,
      tiltZ: (random() - 0.5) * 0.7,
      offset: (random() - 0.5) * 1.6,
    }));
  }, [tier]);

  /* ---- particle buffers ---- */

  const particles = useMemo(() => {
    const random = createRandom(0x7a7a + tier.particles);
    const buffers = pointBuffers(tier.particles);
    const seed = new Float32Array(tier.particles * 8);
    for (let i = 0; i < tier.particles; i += 1) {
      const s = i * 8;
      seed[s] = random() * Math.PI * 2; // scatter angle
      seed[s + 1] = 0.95 + Math.pow(random(), 1.6) * 1.5; // scatter radius
      seed[s + 2] = -1.1 + random() * 2.5; // scatter height
      seed[s + 3] = Math.floor(random() * lattice.pathCount); // path
      seed[s + 4] = random(); // travel phase
      seed[s + 5] = 0.03 + random() * 0.05; // travel speed
      seed[s + 6] = random() * 0.62; // convergence stagger
      seed[s + 7] = random(); // brightness
      buffers.sizes[i] = 0.014 + random() * 0.018;
    }
    return { ...buffers, seed };
  }, [tier, lattice]);

  const streams = useMemo(() => {
    const random = createRandom(0x5a5a + tier.streams);
    const buffers = pointBuffers(tier.streams);
    const seed = new Float32Array(tier.streams * 5);
    for (let i = 0; i < tier.streams; i += 1) {
      seed.set(
        [random() * Math.PI * 2, 0.34 + random() * 0.2, (random() - 0.5) * 1.5, random(), 0.08 + random() * 0.1],
        i * 5
      );
      buffers.sizes[i] = 0.01 + random() * 0.012;
    }
    return { ...buffers, seed };
  }, [tier]);

  const halos = useMemo(() => {
    const buffers = pointBuffers(lattice.nodes.length + 1);
    lattice.nodes.forEach((node, i) => {
      buffers.positions.set([node.x, node.y, node.z], i * 3);
      buffers.sizes[i] = 0.11;
    });
    // The nucleus's own soft light scattering in the glass, last.
    buffers.sizes[lattice.nodes.length] = 0.8;
    return buffers;
  }, [lattice]);

  const backNodes = useMemo(() => {
    const random = createRandom(0xbacc + tier.backdrop.travellers);
    const fixed = backdrop.nodes.length;
    const buffers = pointBuffers(fixed + tier.backdrop.travellers);
    backdrop.nodes.forEach((node, i) => {
      buffers.positions.set([node.x, node.y, node.z], i * 3);
      buffers.sizes[i] = 0.07;
    });
    const seed = new Float32Array(tier.backdrop.travellers * 3);
    for (let i = 0; i < tier.backdrop.travellers; i += 1) {
      seed.set([Math.floor(random() * Math.max(backdrop.arcs.length, 1)), random(), 0.006 + random() * 0.01], i * 3);
      buffers.sizes[fixed + i] = 0.028 + random() * 0.02;
    }
    return { ...buffers, seed, fixed };
  }, [tier, backdrop]);

  const dust = useMemo(() => {
    const random = createRandom(0xd057 + tier.dust);
    const buffers = pointBuffers(tier.dust);
    const seed = new Float32Array(tier.dust * 5);
    for (let i = 0; i < tier.dust; i += 1) {
      seed.set([random() * Math.PI * 2, 0.8 + Math.pow(random(), 1.4) * 2.4, random(), random(), random()], i * 5);
      buffers.sizes[i] = 0.008 + random() * 0.016;
    }
    return { ...buffers, seed };
  }, [tier]);

  const haze = useMemo(() => {
    const random = createRandom(0x4a2e + tier.haze);
    const buffers = pointBuffers(tier.haze);
    const seed = new Float32Array(tier.haze * 4);
    for (let i = 0; i < tier.haze; i += 1) {
      seed.set([random(), random(), random(), random()], i * 4);
      buffers.sizes[i] = 0.12 + random() * 0.26;
    }
    return { ...buffers, seed };
  }, [tier]);

  const palette = useMemo(
    () => ({
      warmLight: orangeOf(theme.brand400),
      key: theme.ink50.clone().lerp(orangeOf(theme.brand300), 0.18),
      fill: theme.cyan300.clone().lerp(theme.ink200, 0.55),
      rim: theme.ink100.clone().lerp(theme.cyan300, 0.25),
      cool: theme.cyan300.clone().lerp(theme.ink200, 0.5),
      warm: orangeOf(theme.brand300),
      hot: orangeOf(theme.brand300).lerp(theme.ink50, 0.5),
    }),
    [theme]
  );

  /* ---- instanced parts (static transforms, built once per tier) ---- */

  const instanced = useMemo(() => {
    const nodes = new InstancedMesh(geometry.node, materials.brightMetal, lattice.nodes.length);
    lattice.nodes.forEach((node, i) => {
      scratchObject.position.copy(node);
      scratchObject.rotation.set(0, Math.atan2(node.x, node.z), 0);
      scratchObject.updateMatrix();
      nodes.setMatrixAt(i, scratchObject.matrix);
    });
    // On the band's corners, where the shell's facets meet.
    const studs = new InstancedMesh(geometry.stud, materials.plateMetal, tier.facets);
    for (let i = 0; i < tier.facets; i += 1) {
      const angle = Math.PI / tier.facets + (i / tier.facets) * Math.PI * 2;
      scratchMatrix.makeRotationY(angle);
      scratchMatrix.setPosition(Math.sin(angle) * 0.632, 0, Math.cos(angle) * 0.632);
      studs.setMatrixAt(i, scratchMatrix);
    }
    return { nodes, studs };
  }, [geometry, materials, lattice, tier]);
  useEffect(
    () => () => {
      instanced.nodes.dispose();
      instanced.studs.dispose();
    },
    [instanced]
  );

  /* ---- per frame ---- */

  useFrame((state, rawDelta) => {
    const root = rootRef.current;
    const core = coreRef.current;
    const sky = environmentRef.current;
    const hazePoints = hazeRef.current;
    const back = backdropRef.current;
    if (!root || !core) return;
    const setVisible = (visible: boolean) => {
      root.visible = visible;
      if (sky) sky.visible = visible;
      if (hazePoints) hazePoints.visible = visible;
      if (back) back.visible = visible;
    };

    const { camera } = state;
    const canvasRect = state.gl.domElement.getBoundingClientRect();
    const width = Math.max(canvasRect.width, 1);
    const height = Math.max(canvasRect.height, 1);
    const dpr = state.viewport.dpr;

    if (!sectionRef.current?.isConnected) sectionRef.current = document.querySelector<HTMLElement>(SECTION_SELECTOR);
    if (!anchorRef.current?.isConnected) anchorRef.current = document.querySelector<HTMLElement>(ANCHOR_SELECTOR);
    if (!contentRef.current?.isConnected) contentRef.current = document.querySelector<HTMLElement>(CONTENT_SELECTOR);
    const section = sectionRef.current?.getBoundingClientRect();
    const anchor = anchorRef.current?.getBoundingClientRect();
    if (!section || !anchor || section.bottom < canvasRect.top || section.top > canvasRect.bottom) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const content = contentRef.current?.getBoundingClientRect();

    /* story */
    const m = motion.current;
    const delta = Math.min(rawDelta, 0.1);
    const scale = tier.motionScale;
    const step = (current: number, target: number, lambda: number) =>
      still ? target : damp(current, target, lambda, delta);
    m.story = still ? 1 : step(m.story, ctaStory.progress, 3.2);
    const p = ctaStoryPhases(m.story, phases.current);
    // Pace: slow while dormant, fullest while connecting, calmer once
    // complete — integrated so a change of pace never jumps.
    const calm = 1 - 0.55 * p.complete;
    if (!still) {
      m.clock += delta * scale * calm;
      m.flow += delta * scale * (0.3 + 0.7 * p.converge) * calm;
      m.spin += delta * scale * (0.08 + 0.92 * p.connect) * calm;
    }
    const elapsed = still ? 0 : state.clock.elapsedTime;
    const lit = tier.intensity;
    /** The core steps back a touch at completion so the CTA leads. */
    const focus = lit * (1 - 0.18 * p.complete);

    /* shared: resolution, section edges, content-safe mask */
    const bufferSize = shield.uResolution.value;
    state.gl.getDrawingBufferSize(bufferSize);
    const sectionTop = bufferSize.y - (section.top - canvasRect.top) * dpr;
    const sectionBottom = bufferSize.y - (section.bottom - canvasRect.top) * dpr;
    shield.uEdges.value.set(sectionTop, sectionBottom);
    shield.uEdgeFeather.value = Math.min(height * 0.3, 260) * dpr;
    const beside = !!content && content.right < anchor.left + anchor.width * 0.25;
    if (content) {
      const cx = (content.left + content.width / 2 - canvasRect.left) * dpr;
      const cy = bufferSize.y - (content.top + content.height / 2 - canvasRect.top) * dpr;
      shield.uShieldRect.value.set(cx, cy, (content.width / 2 + 20) * dpr, (content.height / 2 + 16) * dpr);
      // Wide beside the core on desktop; tight on narrower layouts, where the
      // core sits just above the content and must not be dimmed with it.
      shield.uShieldFeather.value = (beside ? Math.min(280, Math.max(120, content.width * 0.35)) : 56) * dpr;
    }
    shield.uShield.value = content ? Math.min(1, tier.contentShield * (1 + 0.08 * p.complete)) : 0;

    /* placement: framed into the anchor; it emerges from depth as the
       section enters and the view closes in during the intelligence phase */
    const anchorX = anchor.left + anchor.width / 2 - canvasRect.left;
    const anchorY = anchor.top + anchor.height / 2 - canvasRect.top;
    const ndcX = (anchorX / width) * 2 - 1;
    const ndcY = -((anchorY / height) * 2 - 1);
    const depth = -1.6 - (1 - p.wake) * 0.7 * scale + p.energy * 0.35 * scale;
    worldAtDepth(ndcX, ndcY, depth, camera, root.position);
    const visibleHeight = visibleHeightAt(root.position, camera);
    /** Core units per visible-height unit that frame it into the anchor. */
    const frame = Math.min(
      anchor.height / height / CORE_HEIGHT,
      (anchor.width / height) / CORE_WIDTH
    );
    const fit = visibleHeight * frame * tier.fit * (1 + 0.05 * p.energy - 0.03 * p.complete);
    root.scale.setScalar(fit);

    /* cinematic drift: pointer parallax, a slow scroll-linked orbit and an
       extremely slow wander — never enough to feel like a camera move */
    const pointerX = tier.pointer && !still ? journeyState.pointer.x : 0;
    const pointerY = tier.pointer && !still ? journeyState.pointer.y : 0;
    m.tiltX = step(m.tiltX, -pointerY * 0.04, 1.5);
    m.tiltY = step(m.tiltY, pointerX * 0.08, 1.5);
    const orbit = still ? 0 : (m.story - 0.6) * 0.5 * scale;
    const wander = still ? 0 : Math.sin(elapsed * 0.035) * 0.025 * scale;
    root.rotation.set(
      -0.03 + m.tiltX + (still ? 0 : Math.sin(elapsed * 0.027) * 0.01 * scale),
      -0.22 + orbit + m.tiltY + wander,
      0
    );

    /* outer layer: levitation and a very slow turn of the shell */
    core.position.y = -CORE_CENTER_Y + (still ? 0 : Math.sin(elapsed * 0.32) * 0.018 * scale) + p.wake * 0.02;
    if (shellRef.current) shellRef.current.rotation.y = m.clock * 0.012;

    /* middle layer: lattice, plates and gyroscope rings */
    if (latticeRef.current) latticeRef.current.rotation.y = m.clock * 0.012 + (1 - p.organize) * 0.4;
    plates.forEach((plate, i) => {
      const group = plateRefs.current[i];
      if (!group) return;
      const loose = 1 - p.organize;
      group.rotation.set(
        plate.tiltX * loose,
        plate.phase * loose + m.clock * plate.spin + plate.offset * loose,
        plate.tiltZ * loose
      );
      group.position.y = plate.y + (still ? 0 : Math.sin(elapsed * 0.2 + i * 2) * 0.012 * loose * scale);
    });
    RINGS.slice(0, tier.rings).forEach((ring, i) => {
      const group = ringRefs.current[i];
      if (!group) return;
      const lock = p.organize;
      group.rotation.set(
        lerp(ring.locked[0] + ring.loose[0], ring.locked[0], lock),
        lerp(ring.loose[1], ring.locked[1], lock),
        lerp(ring.locked[2] + ring.loose[2], ring.locked[2], lock)
      );
      const spinner = group.children[0];
      if (spinner) spinner.rotation.z = m.spin * ring.spin;
    });

    /* inner layer: nucleus and cage */
    if (nucleusRef.current) {
      nucleusRef.current.rotation.set(m.clock * 0.03, m.clock * 0.07 + p.organize * 0.8, 0);
      nucleusRef.current.scale.setScalar(0.82 + 0.18 * p.energy);
    }
    if (cageRef.current) cageRef.current.rotation.set(0.35, -m.clock * 0.04 - p.organize * 0.6, 0.2);
    const pulse = still ? 0 : Math.sin(m.clock * 1.3) * 0.08 * p.energy;

    /* materials — orange behaves as light: it reaches the reflections,
       plates, rings and floor as the core activates */
    materials.nucleus.emissiveIntensity = (0.15 + 0.5 * p.connect + 2.3 * p.energy) * (1 + pulse) * focus;
    materials.seam.opacity = (0.12 + 0.5 * p.connect + 0.28 * p.energy) * focus;
    materials.etch.opacity = 0.07 + 0.08 * p.wake + 0.05 * p.energy;
    materials.cage.opacity = 0.18 + 0.22 * p.organize;
    const envIntensity = (0.35 + 0.6 * p.wake + 0.35 * p.energy) * lit;
    const envYaw = 0.4 + root.rotation.y * 1.4 + Math.sin(elapsed * 0.03) * 0.15;
    reflective.forEach((material) => {
      material.envMapIntensity = envIntensity * (material === materials.brightMetal ? 1.2 : 1);
      material.envMapRotation.set(0.05 + m.tiltX, envYaw, 0);
    });

    const paths = shaders.paths.uniforms;
    paths.uConnect!.value = p.connect;
    paths.uEnergy!.value = p.energy * focus;
    paths.uWake!.value = p.wake;
    paths.uTime!.value = m.clock;

    const floor = shaders.floor.uniforms;
    floor.uOpacity!.value = 0.55 + 0.45 * p.wake;
    floor.uWarm!.value = (0.25 + 0.4 * p.connect + 0.6 * p.energy) * focus;

    /* lights (in the core's space, so they scale with it) */
    const keyAngle = still ? -0.6 : -0.6 + Math.sin(elapsed * 0.05) * 0.35 * scale;
    if (keyLightRef.current) {
      // Kept below crown height so its highlight rakes across the facets
      // instead of flaring on the upper chamfer.
      keyLightRef.current.position.set(Math.sin(keyAngle) * 3.4, 1.1, 2.6 + Math.cos(keyAngle));
      keyLightRef.current.distance = 12 * fit;
      keyLightRef.current.intensity = (0.8 + 2.6 * p.wake) * lit * fit;
    }
    if (fillLightRef.current) {
      fillLightRef.current.position.set(2.8, -0.2, 1.8);
      fillLightRef.current.distance = 9 * fit;
      fillLightRef.current.intensity = (0.25 + 0.7 * p.wake) * lit * fit;
    }
    if (rimLightRef.current) {
      rimLightRef.current.position.set(1.2, 2.2, -2.4);
      rimLightRef.current.distance = 8 * fit;
      rimLightRef.current.intensity = (0.6 + 1.6 * p.wake + 0.4 * p.energy) * lit * fit;
    }
    if (coreLightRef.current) {
      coreLightRef.current.distance = 4.5 * fit;
      coreLightRef.current.intensity = (0.1 + 0.5 * p.connect + 1.7 * p.energy) * (1 + pulse) * focus * fit;
    }

    /* environment */
    const pixelScale = bufferSize.y / (2 * Math.tan((fovOf(camera) * Math.PI) / 360));
    if (sky) {
      worldAtDepth(0, 0, -9, camera, sky.position);
      const farHeight = visibleHeightAt(sky.position, camera);
      sky.scale.set(farHeight * (width / height) * 1.3, farHeight * 1.3, 1);
      sky.quaternion.copy(camera.quaternion);
      const u = shaders.environment.uniforms;
      u.uTime!.value = elapsed;
      u.uFocus!.value.set(anchorX / width, 1 - anchorY / height);
      const coreScreenHeight = (CORE_HEIGHT * fit) / visibleHeight;
      u.uFocusSize!.value.set(coreScreenHeight * (height / width) * 0.55, coreScreenHeight * 0.5);
      u.uWake!.value = p.wake;
      u.uEnergy!.value = p.energy * (1 - 0.15 * p.complete);
      u.uIntensity!.value = lit;
    }

    /* supporting structures: far behind, moving slower than the core, lit
       by the core's light falloff */
    core.getWorldPosition(corePoint);
    if (back) {
      worldAtDepth(ndcX, ndcY, depth - 3.2, camera, back.position);
      const backFit = visibleHeightAt(back.position, camera) * frame * tier.fit;
      back.scale.setScalar(backFit);
      back.position.x += still ? 0 : Math.sin(elapsed * 0.02) * 0.05;
      back.rotation.set(
        0.02 + m.tiltX * 0.35,
        (root.rotation.y + 0.22) * 0.3 + (still ? 0 : Math.sin(elapsed * 0.012) * 0.05),
        0
      );
      const backDistance = camera.position.distanceTo(back.position);
      [shaders.structure, shaders.links, shaders.panel].forEach((material) => {
        const u = material.uniforms;
        u.uCore!.value.copy(corePoint);
        u.uReach!.value = CORE_HEIGHT * fit * 1.35;
        u.uEnergy!.value = p.energy * focus;
        u.uWake!.value = p.wake;
        u.uFog!.value.set(backDistance - 1.5 * backFit, backDistance + 3.5 * backFit);
      });
      shaders.structure.uniforms.uOpacity!.value = (0.035 + 0.065 * p.wake) * lit;
      shaders.links.uniforms.uOpacity!.value = (0.02 + 0.2 * p.connect) * focus;
      shaders.panel.uniforms.uOpacity!.value = (0.12 + 0.26 * p.wake) * lit;
      shaders.panel.uniforms.uSheen!.value = 0.2 + root.rotation.y * 1.8 + m.story * 0.5;
    }

    /* points */
    const rootSize = pixelScale * fit;
    shaders.particles.uniforms.uSize!.value = rootSize;
    shaders.streams.uniforms.uSize!.value = rootSize;
    shaders.halos.uniforms.uSize!.value = rootSize;
    shaders.dust.uniforms.uSize!.value = rootSize;
    shaders.haze.uniforms.uSize!.value = pixelScale;
    if (back) shaders.backNodes.uniforms.uSize!.value = pixelScale * back.scale.x;

    // Data points: scattered through the studio (cool), converging onto the
    // paths (warm) and circulating through the architecture.
    const ps = particles.seed;
    for (let i = 0; i < particles.count; i += 1) {
      const s = i * 8;
      const path = ps[s + 3]!;
      const c = smoothstep(ps[s + 6]!, ps[s + 6]! + 0.38, p.converge);
      const ease = c * c * (3 - 2 * c);
      const travel = (ps[s + 4]! + m.flow * ps[s + 5]!) % 1;
      samplePath(lattice.samples, path, travel, pathPoint);
      const angle = ps[s]! + m.clock * 0.01;
      const radius = ps[s + 1]!;
      const o = i * 3;
      particles.positions[o] = lerp(Math.sin(angle) * radius, pathPoint.x, ease);
      particles.positions[o + 1] = lerp(ps[s + 2]! + Math.sin(elapsed * 0.15 + i) * 0.05 * scale, pathPoint.y, ease);
      particles.positions[o + 2] = lerp(Math.cos(angle) * radius * 0.6, pathPoint.z, ease);
      const pathLit = clamp((p.connect - lattice.order[path]! * 0.72) / 0.28);
      tint.copy(palette.cool).lerp(palette.warm, ease).lerp(palette.hot, pathLit * p.energy * 0.6);
      const b = (0.2 + ps[s + 7]! * 0.3) * (0.3 + 0.7 * p.wake) * (0.4 + 0.6 * ease + 0.6 * pathLit * ease) * focus;
      particles.colors[o] = tint.r * b;
      particles.colors[o + 1] = tint.g * b;
      particles.colors[o + 2] = tint.b * b;
    }
    markDirty(particlesRef.current);

    // Inner data streams spiralling into the nucleus, brighter as they
    // arrive — they run once the system starts thinking.
    const ss = streams.seed;
    const streamGate = smoothstep(0.1, 0.7, p.connect) * (0.35 + 0.65 * p.energy);
    for (let i = 0; i < streams.count; i += 1) {
      const s = i * 5;
      const t = (ss[s + 3]! + m.flow * ss[s + 4]!) % 1;
      const inward = Math.pow(1 - t, 1.25);
      const angle = ss[s]! + t * 2.6;
      const radius = NUCLEUS_RADIUS * 0.4 + (ss[s + 1]! - NUCLEUS_RADIUS * 0.4) * inward;
      const o = i * 3;
      streams.positions[o] = Math.sin(angle) * radius;
      streams.positions[o + 1] = ss[s + 2]! * inward;
      streams.positions[o + 2] = Math.cos(angle) * radius;
      tint.copy(palette.warm).lerp(palette.hot, t);
      const b = Math.sin(t * Math.PI) * (0.25 + 0.75 * t) * 0.55 * streamGate * focus;
      streams.colors[o] = tint.r * b;
      streams.colors[o + 1] = tint.g * b;
      streams.colors[o + 2] = tint.b * b;
    }
    markDirty(streamsRef.current);

    lattice.nodes.forEach((_, i) => {
      const nodeLit = clamp((p.connect - lattice.nodeThreshold[i]! * 0.72) / 0.12);
      const b = (0.04 + 0.4 * nodeLit + 0.2 * p.energy * nodeLit) * focus;
      halos.colors[i * 3] = palette.warm.r * b;
      halos.colors[i * 3 + 1] = palette.warm.g * b;
      halos.colors[i * 3 + 2] = palette.warm.b * b;
    });
    const nucleusGlow = (0.03 + 0.08 * p.connect + 0.32 * p.energy) * (1 + pulse) * focus;
    const n = lattice.nodes.length * 3;
    halos.colors[n] = palette.warmLight.r * nucleusGlow;
    halos.colors[n + 1] = palette.warmLight.g * nucleusGlow;
    halos.colors[n + 2] = palette.warmLight.b * nucleusGlow;
    markDirty(halosRef.current);

    // Backdrop data nodes (fixed) and points travelling the arcs.
    if (backNodesRef.current && back) {
      for (let i = 0; i < backNodes.fixed; i += 1) {
        const node = backdrop.nodes[i]!;
        const near = Math.exp(-node.lengthSq() / 6);
        tint.copy(palette.cool).lerp(palette.warm, near * p.energy);
        const b = (0.05 + 0.12 * p.wake + 0.1 * p.connect) * lit;
        backNodes.colors[i * 3] = tint.r * b;
        backNodes.colors[i * 3 + 1] = tint.g * b;
        backNodes.colors[i * 3 + 2] = tint.b * b;
      }
      const bs = backNodes.seed;
      for (let i = 0; i < tier.backdrop.travellers; i += 1) {
        const arc = backdrop.arcs[bs[i * 3]!];
        if (!arc) continue;
        const o = (backNodes.fixed + i) * 3;
        const t = (bs[i * 3 + 1]! + m.flow * bs[i * 3 + 2]!) % 1;
        arcPoint(arc, t, pathPoint);
        backNodes.positions[o] = pathPoint.x;
        backNodes.positions[o + 1] = pathPoint.y;
        backNodes.positions[o + 2] = pathPoint.z;
        tint.copy(palette.cool).lerp(palette.warm, 0.3 + 0.5 * p.energy);
        const b = Math.sin(t * Math.PI) * (0.06 + 0.2 * p.connect) * lit;
        backNodes.colors[o] = tint.r * b;
        backNodes.colors[o + 1] = tint.g * b;
        backNodes.colors[o + 2] = tint.b * b;
      }
      markDirty(backNodesRef.current);
    }

    // Fine dust around the core — lit warm near it, cool further out.
    const ds = dust.seed;
    for (let i = 0; i < dust.count; i += 1) {
      const s = i * 5;
      const angle = ds[s]! + m.clock * (0.004 + ds[s + 3]! * 0.01) * (ds[s + 4]! < 0.5 ? -1 : 1);
      const radius = ds[s + 1]!;
      const rise = (ds[s + 2]! + m.clock * (0.002 + ds[s + 3]! * 0.004)) % 1;
      const o = i * 3;
      dust.positions[o] = Math.sin(angle) * radius;
      dust.positions[o + 1] = FLOOR_Y - CORE_CENTER_Y + rise * 3.6;
      dust.positions[o + 2] = Math.cos(angle) * radius * 0.7;
      const near = 1 - smoothstep(0.8, 2.6, radius);
      tint.copy(theme.ink300).lerp(palette.warm, near * (0.3 + 0.7 * p.energy));
      const b = Math.sin(rise * Math.PI) * (0.08 + ds[s + 4]! * 0.2) * (0.4 + 0.6 * p.wake) * lit;
      dust.colors[o] = tint.r * b;
      dust.colors[o + 1] = tint.g * b;
      dust.colors[o + 2] = tint.b * b;
    }
    markDirty(dustRef.current);

    // Distant, blurred motes far behind — the deepest layer.
    if (hazePoints) {
      worldAtDepth(ndcX * 0.4, 0, -7, camera, hazePoints.position);
      hazePoints.quaternion.copy(camera.quaternion);
      const farHeight = visibleHeightAt(hazePoints.position, camera);
      const farWidth = farHeight * (width / height);
      const hs = haze.seed;
      for (let i = 0; i < haze.count; i += 1) {
        const s = i * 4;
        const drift = (hs[s + 1]! + m.clock * (0.0015 + hs[s + 2]! * 0.002)) % 1;
        const o = i * 3;
        haze.positions[o] = (hs[s]! - 0.5) * farWidth * 1.1 - m.tiltY * 0.6;
        haze.positions[o + 1] = (drift - 0.5) * farHeight * 1.1 + m.tiltX * 0.4;
        haze.positions[o + 2] = (hs[s + 3]! - 0.5) * 2;
        const pick = hs[s + 3]!;
        tint.copy(pick < 0.3 ? palette.warm : pick < 0.6 ? theme.violet400 : theme.cyan300);
        const b = Math.sin(drift * Math.PI) * (0.008 + hs[s + 2]! * 0.016) * (0.4 + 0.6 * p.wake) * lit;
        haze.colors[o] = tint.r * b;
        haze.colors[o + 1] = tint.g * b;
        haze.colors[o + 2] = tint.b * b;
      }
      markDirty(hazePoints);
    }
  });

  const pointsGeometry = (buffers: { positions: Float32Array; colors: Float32Array; sizes: Float32Array }) => (
    <bufferGeometry>
      <bufferAttribute attach="attributes-position" args={[buffers.positions, 3]} />
      <bufferAttribute attach="attributes-aColor" args={[buffers.colors, 3]} />
      <bufferAttribute attach="attributes-aSize" args={[buffers.sizes, 1]} />
    </bufferGeometry>
  );

  return (
    <>
      <mesh
        ref={environmentRef}
        material={shaders.environment}
        renderOrder={-10}
        frustumCulled={false}
        visible={false}
      >
        <planeGeometry args={[1, 1]} />
      </mesh>

      <points ref={hazeRef} material={shaders.haze} frustumCulled={false} visible={false}>
        {pointsGeometry(haze)}
      </points>

      <group ref={backdropRef} visible={false}>
        <lineSegments geometry={backdrop.lines} material={shaders.structure} frustumCulled={false} />
        <lineSegments geometry={backdrop.links} material={shaders.links} frustumCulled={false} />
        {backdrop.panels.map((panel, i) => (
          <mesh
            key={i}
            geometry={geometry.panel}
            material={shaders.panel}
            position={panel.position}
            rotation={panel.rotation}
            scale={[panel.size[0], panel.size[1], 1]}
            frustumCulled={false}
          />
        ))}
        <points ref={backNodesRef} material={shaders.backNodes} frustumCulled={false}>
          {pointsGeometry(backNodes)}
        </points>
      </group>

      <group ref={rootRef} visible={false}>
        {still ? (
          // The standalone still canvas has no shared light rig.
          <ambientLight intensity={0.18} color={theme.ink200} />
        ) : null}
        <pointLight ref={keyLightRef} color={palette.key} intensity={0} decay={2} />
        <pointLight ref={fillLightRef} color={palette.fill} intensity={0} decay={2} />
        <pointLight ref={rimLightRef} color={palette.rim} intensity={0} decay={2} />

        <group position={[0, -CORE_CENTER_Y, 0]}>
          <mesh
            geometry={geometry.floor}
            material={shaders.floor}
            position={[0, FLOOR_Y, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={-5}
          />
          <mesh geometry={geometry.plinth} material={materials.metal} position={[0, PLINTH_Y, 0]} />
          <mesh
            geometry={geometry.plinthSeam}
            material={materials.seam}
            position={[0, PLINTH_Y + 0.101, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          />
        </group>

        <points ref={dustRef} material={shaders.dust} frustumCulled={false}>
          {pointsGeometry(dust)}
        </points>

        <group ref={coreRef}>
          <pointLight ref={coreLightRef} color={palette.warmLight} intensity={0} decay={2} />

          {geometry.rings.map((ring, i) => (
            <group
              key={i}
              ref={(group) => {
                ringRefs.current[i] = group;
              }}
            >
              <group>
                <mesh geometry={ring} material={materials.brightMetal} />
                {Array.from({ length: BEADS_PER_RING }, (_, b) => {
                  const angle = (b / BEADS_PER_RING) * Math.PI * 2 + i;
                  const radius = RINGS[i]!.radius;
                  return (
                    <mesh
                      key={b}
                      geometry={geometry.bead}
                      material={materials.plateMetal}
                      position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0]}
                    />
                  );
                })}
              </group>
            </group>
          ))}

          <group ref={nucleusRef}>
            <mesh geometry={geometry.nucleus} material={materials.nucleus} scale={[1, 1.35, 1]} />
          </group>
          <group ref={cageRef}>
            <lineSegments geometry={geometry.cage} material={materials.cage} />
          </group>
          <points ref={streamsRef} material={shaders.streams} renderOrder={1} frustumCulled={false}>
            {pointsGeometry(streams)}
          </points>

          {plates.map((plate, i) => (
            <group
              key={i}
              ref={(group) => {
                plateRefs.current[i] = group;
              }}
              position={[0, plate.y, 0]}
            >
              <mesh geometry={geometry.plate} material={materials.plateMetal} />
              <mesh
                geometry={geometry.plateSeam}
                material={materials.seam}
                position={[0, 0.0145, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
              />
            </group>
          ))}

          <group ref={latticeRef}>
            <primitive object={instanced.nodes} />
            <mesh geometry={lattice.tubes} material={shaders.paths} renderOrder={1} frustumCulled={false} />
            <points ref={halosRef} material={shaders.halos} renderOrder={1} frustumCulled={false}>
              {pointsGeometry(halos)}
            </points>
            <points ref={particlesRef} material={shaders.particles} renderOrder={1} frustumCulled={false}>
              {pointsGeometry(particles)}
            </points>
          </group>

          <group ref={shellRef}>
            <mesh geometry={geometry.collar} material={materials.metal} />
            <mesh geometry={geometry.collar} material={materials.metal} scale={[1, -1, 1]} />
            <mesh geometry={geometry.band} material={materials.metal} />
            <primitive object={instanced.studs} />
            <mesh
              geometry={geometry.shell}
              material={materials.innerGlass}
              scale={[0.93, 0.965, 0.93]}
              renderOrder={2}
            />
            <mesh geometry={geometry.shell} material={materials.glass} renderOrder={3} />
            <lineSegments geometry={geometry.etch} material={materials.etch} renderOrder={4} />
          </group>
        </group>
      </group>
    </>
  );
}
