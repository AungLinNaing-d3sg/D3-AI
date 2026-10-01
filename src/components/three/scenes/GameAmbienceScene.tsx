"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CapsuleGeometry,
  Color,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  PMREMGenerator,
  TorusGeometry,
  Vector3,
  type BufferAttribute,
  type Group,
  type PerspectiveCamera,
  type PointLight,
  type Points,
  type WebGLRenderer,
} from "three";
import { createRandom } from "@/components/three/scenes/ctaCore/geometry";
import {
  buildStudio,
  createGlowPoints,
  createShieldUniforms,
  createStructureMaterial,
  orangeOf,
  withShield,
} from "@/components/three/scenes/ctaCore/materials";
import {
  buildChannels,
  buildCoreFrame,
  buildFarFrames,
  buildNetwork,
  channelPoint,
  CORE_RINGS,
  layoutFor,
} from "@/components/three/scenes/gameAmbience/geometry";
import {
  createChannelMaterial,
  createGameEnvironment,
  createNetworkLinkMaterial,
  createStreakMaterial,
} from "@/components/three/scenes/gameAmbience/materials";
import { journeyState } from "@/lib/motion/journeyState";
import { playgroundState } from "@/lib/motion/playgroundState";
import { damp, smoothstep } from "@/lib/motion/mathUtils";
import type { SceneQuality } from "@/lib/three/deviceTiers";
import { getThemeColors } from "@/lib/three/themeColors";

interface GameAmbienceSceneProps {
  quality: SceneQuality;
}

/** The playground UI (heading, menu/experience) the background stays soft
 * behind — see `data-game-content` in components/sections/GameSection.tsx. */
const CONTENT_SELECTOR = "[data-game-content]";
/** Distance from the camera at which the environment's screen-local root
 * sits; its children spread in depth around it. */
const ROOT_DISTANCE = 7;

interface AmbienceTier {
  networkNodes: number;
  rings: number;
  channels: number;
  farFrames: number;
  dust: number;
  haze: number;
  travellers: number;
  inflow: number;
  bokeh: number;
  streaks: number;
  pointer: boolean;
  motionScale: number;
  contentShield: number;
}

export const AMBIENCE_TIERS: Record<SceneQuality, AmbienceTier> = {
  high: {
    networkNodes: 46,
    rings: 5,
    channels: 3,
    farFrames: 4,
    dust: 110,
    haze: 16,
    travellers: 42,
    inflow: 28,
    bokeh: 7,
    streaks: 3,
    pointer: true,
    motionScale: 1,
    contentShield: 0.8,
  },
  medium: {
    networkNodes: 32,
    rings: 4,
    channels: 2,
    farFrames: 2,
    dust: 60,
    haze: 10,
    travellers: 26,
    inflow: 18,
    bokeh: 4,
    streaks: 2,
    pointer: true,
    motionScale: 0.8,
    contentShield: 0.85,
  },
  low: {
    networkNodes: 20,
    rings: 3,
    channels: 1,
    farFrames: 1,
    dust: 28,
    haze: 5,
    travellers: 12,
    inflow: 8,
    bokeh: 0,
    streaks: 0,
    pointer: false,
    motionScale: 0.6,
    contentShield: 0.9,
  },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const forward = new Vector3();
const scratch = new Vector3();
const projected = new Vector3();
const tint = new Color();
const accent = new Color();
const scratchMatrix = new Matrix4();

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
 * The visual surfaces of the playground UI — the heading block and the
 * menu / experience cards — found as the first descendants along each branch
 * that are narrower than the full-width container (so full-width layout
 * wrappers don't swallow the margins where the environment should stay
 * visible). Decorative (`aria-hidden`) and screen-reader-only nodes are
 * skipped.
 */
function collectSurfaces(root: HTMLElement): HTMLElement[] {
  const full = root.getBoundingClientRect().width;
  const out: HTMLElement[] = [];
  const visit = (element: Element, depth: number) => {
    for (const child of Array.from(element.children)) {
      if (!(child instanceof HTMLElement)) continue;
      if (child.getAttribute("aria-hidden") === "true" || child.classList.contains("sr-only")) continue;
      const rect = child.getBoundingClientRect();
      if (rect.height < 8 || rect.width < 8) continue;
      if (rect.width < full * 0.92 || depth >= 4) out.push(child);
      else visit(child, depth + 1);
    }
  };
  visit(root, 0);
  return out;
}

/** Decaying 0..1 response to a playground signal fired at `at` (ms). */
function response(at: number, now: number, duration: number): number {
  if (!at) return 0;
  const t = (now - at) / duration;
  return t < 0 || t > 1 ? 0 : 1 - t;
}

/**
 * Chapter 06 backdrop — the environment the (unchanged, DOM-driven) AI
 * Playground operates inside: a large AI engineering space rather than a
 * particle field, in depth layers, in an asymmetric composition that keeps
 * the centre calm for the UI:
 *
 * - Far: the studio atmosphere (screen space — graphite/midnight
 *   foundation, cyan light around the network, burnt-orange light around the
 *   processing structure, violet depth above, drifting haze, depth fog) with
 *   distant frame architecture and a few large blurred motes.
 * - Mid, right/back: a data network — dark-metal nodes on a shell, joined by
 *   links that activate now and then with a pulse running along them, lit
 *   cool by its own cyan light.
 * - Mid, left/back: a processing structure — a glass capsule inside five
 *   interlocking, slowly turning metal rings and a hexagonal frame, around a
 *   faceted orange core whose light is a real light on the rings and whose
 *   falloff warms the frame lines and nearby dust.
 * - Between them, far back and bowing through the margins: glass data
 *   channels carrying packets and data points from the network to the core —
 *   DATA → CONNECTION → PROCESSING → INTELLIGENCE — cool as they leave,
 *   warm as they arrive, with data spiralling into the core.
 * - Near: fine dust, a few soft foreground motes and faint light streaks.
 *
 * Each layer drifts with the pointer and the chapter's scroll progress at
 * its own rate (parallax), all slow. It responds, restrained, to what the
 * playground reports (lib/motion/playgroundState.ts): busier data flow while
 * an experience runs, an energy lift when an agent is chosen, a light wave
 * with synchronised particles on success, a brief amber disturbance on a
 * failure. It fades with the chapter's crossfade weight, and behind the UI
 * everything is dimmed, desaturated, thinned and defocused in the shaders.
 * Reduced motion / no WebGL: the shared canvas isn't mounted; the section
 * shows a static studio instead (components/sections/GameSection.tsx).
 */
export function GameAmbienceScene({ quality }: GameAmbienceSceneProps) {
  const tier = AMBIENCE_TIERS[quality];
  const gl = useThree((state) => state.gl) as WebGLRenderer | undefined;
  const size = useThree((state) => state.size);
  const theme = useMemo(() => getThemeColors(), []);
  /** Rounded so the composition rebuilds only on a real shape change. */
  const aspect = Math.round((size.width / Math.max(size.height, 1)) * 20) / 20;
  const layout = useMemo(() => layoutFor(aspect), [aspect]);

  const environmentRef = useRef<Mesh>(null);
  const rootRef = useRef<Group>(null);
  const farRef = useRef<Group>(null);
  const networkRef = useRef<Group>(null);
  const coreRef = useRef<Group>(null);
  const ringRefs = useRef<(Group | null)[]>([]);
  const nucleusRef = useRef<Mesh>(null);
  const nearRef = useRef<Group>(null);
  const streakRefs = useRef<(Mesh | null)[]>([]);
  const dustRef = useRef<Points>(null);
  const hazeRef = useRef<Points>(null);
  const travellersRef = useRef<Points>(null);
  const inflowRef = useRef<Points>(null);
  const halosRef = useRef<Points>(null);
  const bokehRef = useRef<Points>(null);
  const coreLightRef = useRef<PointLight>(null);
  const netLightRef = useRef<PointLight>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const surfaces = useRef<{ list: HTMLElement[]; dirty: boolean }>({ list: [], dirty: true });

  const motion = useRef({ weight: 0, activity: 0, flow: 0, clock: 0, px: 0, py: 0 });

  /* ---- materials ---- */

  const shield = useMemo(() => createShieldUniforms(theme), [theme]);

  const materials = useMemo(
    () => ({
      glass: withShield(
        new MeshPhysicalMaterial({
          color: theme.ink50.clone(),
          metalness: 0,
          roughness: 0.06,
          clearcoat: 1,
          clearcoatRoughness: 0.05,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          envMapIntensity: 1.1,
        }),
        shield,
        "g6-glass",
        true
      ),
      ring: withShield(
        new MeshPhysicalMaterial({
          color: theme.ink500.clone().lerp(theme.ink300, 0.2),
          metalness: 1,
          roughness: 0.28,
          clearcoat: 0.3,
          transparent: true,
          opacity: 0,
          envMapIntensity: 1,
        }),
        shield,
        "g6-ring",
        true
      ),
      node: withShield(
        new MeshStandardMaterial({
          color: theme.ink700.clone(),
          metalness: 0.85,
          roughness: 0.32,
          emissive: theme.cyan400.clone(),
          emissiveIntensity: 0.1,
          flatShading: true,
          transparent: true,
          opacity: 0,
          envMapIntensity: 1,
        }),
        shield,
        "g6-node"
      ),
      nucleus: withShield(
        new MeshStandardMaterial({
          color: theme.ink800.clone(),
          metalness: 0.6,
          roughness: 0.25,
          emissive: orangeOf(theme.brand400),
          emissiveIntensity: 1,
          flatShading: true,
          transparent: true,
          opacity: 0,
        }),
        shield,
        "g6-nucleus"
      ),
    }),
    [theme, shield]
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);

  const shaders = useMemo(
    () => ({
      environment: createGameEnvironment(theme, shield),
      links: createNetworkLinkMaterial(theme, shield),
      channels: createChannelMaterial(theme, shield),
      streaks: createStreakMaterial(theme, shield),
      frames: createStructureMaterial(theme, shield, false),
      coreFrame: createStructureMaterial(theme, shield, false),
      dust: createGlowPoints(shield, 2.6),
      haze: createGlowPoints(shield, 1.5),
      travellers: createGlowPoints(shield, 3.2),
      inflow: createGlowPoints(shield, 3.4),
      halos: createGlowPoints(shield, 4),
      bokeh: createGlowPoints(shield, 1.3),
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
  useEffect(() => {
    Object.values(materials).forEach((material) => {
      material.envMap = envTarget?.texture ?? null;
      material.needsUpdate = true;
    });
    return () => envTarget?.dispose();
  }, [envTarget, materials]);

  /* ---- geometry ---- */

  const geometry = useMemo(
    () => ({
      capsule: new CapsuleGeometry(0.075, 0.5, 8, 28),
      nucleus: new OctahedronGeometry(0.028, 0),
      bead: new OctahedronGeometry(0.008, 0),
      node: new OctahedronGeometry(0.011, 0),
      streak: new PlaneGeometry(1, 1),
      coreFrame: buildCoreFrame(),
      rings: CORE_RINGS.slice(0, tier.rings).map((ring) => new TorusGeometry(ring.radius, ring.tube, 6, 160)),
    }),
    [tier]
  );
  useEffect(
    () => () =>
      Object.values(geometry).forEach((g) => (Array.isArray(g) ? g.forEach((item) => item.dispose()) : g.dispose())),
    [geometry]
  );

  const network = useMemo(() => buildNetwork(tier.networkNodes), [tier]);
  useEffect(() => () => network.links.dispose(), [network]);

  const channels = useMemo(() => buildChannels(layout, tier.channels), [layout, tier]);
  useEffect(() => () => channels.tubes.dispose(), [channels]);

  const farFrames = useMemo(() => buildFarFrames(aspect, tier.farFrames), [aspect, tier]);
  useEffect(() => () => farFrames.dispose(), [farFrames]);

  const nodes = useMemo(() => {
    const mesh = new InstancedMesh(geometry.node, materials.node, network.nodes.length);
    network.nodes.forEach((node, i) => {
      scratchMatrix.makeRotationY(i * 0.7);
      scratchMatrix.setPosition(node);
      mesh.setMatrixAt(i, scratchMatrix);
    });
    return mesh;
  }, [geometry, materials, network]);
  useEffect(
    () => () => {
      nodes.dispose();
    },
    [nodes]
  );

  /* ---- point buffers ---- */

  const dust = useMemo(() => {
    const random = createRandom(0xd0d0 + tier.dust);
    const buffers = pointBuffers(tier.dust);
    const seed = Float32Array.from({ length: tier.dust * 5 }, () => random());
    for (let i = 0; i < tier.dust; i += 1) buffers.sizes[i] = 0.0016 + random() * 0.0028;
    return { ...buffers, seed };
  }, [tier]);

  const haze = useMemo(() => {
    const random = createRandom(0x4a2e + tier.haze);
    const buffers = pointBuffers(tier.haze);
    const seed = Float32Array.from({ length: tier.haze * 4 }, () => random());
    for (let i = 0; i < tier.haze; i += 1) buffers.sizes[i] = 0.03 + random() * 0.05;
    return { ...buffers, seed };
  }, [tier]);

  const travellers = useMemo(() => {
    const random = createRandom(0x7a4e + tier.travellers);
    const buffers = pointBuffers(tier.travellers);
    const seed = Float32Array.from({ length: tier.travellers * 3 }, () => random());
    for (let i = 0; i < tier.travellers; i += 1) buffers.sizes[i] = 0.0035 + random() * 0.003;
    return { ...buffers, seed };
  }, [tier]);

  const inflow = useMemo(() => {
    const random = createRandom(0x1f10 + tier.inflow);
    const buffers = pointBuffers(tier.inflow);
    const seed = Float32Array.from({ length: tier.inflow * 4 }, () => random());
    for (let i = 0; i < tier.inflow; i += 1) buffers.sizes[i] = 0.006 + random() * 0.006;
    return { ...buffers, seed };
  }, [tier]);

  const halos = useMemo(() => {
    const random = createRandom(0x4a10 + network.nodes.length);
    const buffers = pointBuffers(network.nodes.length);
    const seed = Float32Array.from({ length: network.nodes.length }, () => random());
    network.nodes.forEach((node, i) => {
      buffers.positions.set([node.x, node.y, node.z], i * 3);
      buffers.sizes[i] = 0.04 + seed[i]! * 0.02;
    });
    return { ...buffers, seed };
  }, [network]);

  const bokeh = useMemo(() => {
    const random = createRandom(0xb0ce + tier.bokeh);
    const buffers = pointBuffers(tier.bokeh);
    const seed = Float32Array.from({ length: tier.bokeh * 4 }, () => random());
    for (let i = 0; i < tier.bokeh; i += 1) buffers.sizes[i] = 0.035 + random() * 0.03;
    return { ...buffers, seed };
  }, [tier]);

  const streaks = useMemo(() => {
    const random = createRandom(0x57e4 + tier.streaks);
    return Array.from({ length: tier.streaks }, () => ({
      y: (random() - 0.5) * 0.8,
      z: 0.18 + random() * 0.2,
      length: 0.35 + random() * 0.3,
      speed: 0.004 + random() * 0.006,
      phase: random(),
    }));
  }, [tier]);

  const palette = useMemo(
    () => ({
      warm: orangeOf(theme.brand300),
      warmLight: orangeOf(theme.brand400),
      cool: theme.cyan300.clone().lerp(theme.ink200, 0.45),
      coolLight: theme.cyan400.clone().lerp(theme.ink200, 0.3),
      violet: theme.violet400.clone(),
      neutral: theme.ink300.clone(),
    }),
    [theme]
  );

  /* ---- content surfaces: re-collected only when the UI's DOM changes ---- */

  useEffect(() => {
    const content = document.querySelector<HTMLElement>(CONTENT_SELECTOR);
    contentRef.current = content;
    if (!content) return;
    const markDirtySurfaces = () => {
      surfaces.current.dirty = true;
    };
    const mutations = new MutationObserver(markDirtySurfaces);
    mutations.observe(content, { childList: true, subtree: true });
    const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(markDirtySurfaces) : undefined;
    resize?.observe(content);
    return () => {
      mutations.disconnect();
      resize?.disconnect();
    };
  }, []);

  /* ---- per frame ---- */

  useFrame((state, rawDelta) => {
    const root = rootRef.current;
    const sky = environmentRef.current;
    if (!root) return;
    const m = motion.current;
    const delta = Math.min(rawDelta, 0.1);
    const scale = tier.motionScale;

    const weight = journeyState.weight.game;
    m.weight = damp(m.weight, weight, 6, delta);
    const visible = m.weight > 0.002;
    root.visible = visible;
    if (sky) sky.visible = visible;
    if (!visible) return;

    const { camera } = state;
    const perspective = camera as PerspectiveCamera;
    const canvasRect = state.gl.domElement.getBoundingClientRect();
    const width = Math.max(canvasRect.width, 1);
    const height = Math.max(canvasRect.height, 1);
    const dpr = state.viewport.dpr;
    const now = performance.now();

    /* playground state → restrained responses */
    m.activity = damp(m.activity, playgroundState.activity, 1.4, delta);
    const select = response(playgroundState.signals.select, now, 1600);
    const successAge = response(playgroundState.signals.success, now, 2400);
    const wave = successAge > 0 ? 1 - successAge : 0;
    const sync = successAge > 0 ? Math.sin(wave * Math.PI) : 0;
    const failure = response(playgroundState.signals.failure, now, 1200);
    const wake = smoothstep(0, 1, m.weight);
    const lively = (0.25 + 0.75 * m.activity) * scale;
    m.clock += delta * scale;
    m.flow += delta * lively;
    accent.set(playgroundState.accentHex);

    /* screen-local root: faces the camera, one unit = the visible height */
    camera.getWorldDirection(forward);
    root.position.copy(camera.position).addScaledVector(forward, ROOT_DISTANCE);
    root.quaternion.copy(camera.quaternion);
    const unit = 2 * Math.tan(((perspective.fov ?? 42) * Math.PI) / 360) * ROOT_DISTANCE;
    root.scale.setScalar(unit);

    /* shared: resolution, content-safe region */
    const bufferSize = shield.uResolution.value;
    state.gl.getDrawingBufferSize(bufferSize);
    shield.uEdges.value.set(1e5, -1e5);
    const content = contentRef.current;
    if (content && surfaces.current.dirty) {
      surfaces.current.list = collectSurfaces(content);
      surfaces.current.dirty = false;
    }
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    surfaces.current.list.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      left = Math.min(left, rect.left);
      top = Math.min(top, rect.top);
      right = Math.max(right, rect.right);
      bottom = Math.max(bottom, rect.bottom);
    });
    if (right > left) {
      const pad = 14;
      const cx = ((left + right) / 2 - canvasRect.left) * dpr;
      const cy = bufferSize.y - ((top + bottom) / 2 - canvasRect.top) * dpr;
      shield.uShieldRect.value.set(cx, cy, ((right - left) / 2 + pad) * dpr, ((bottom - top) / 2 + pad) * dpr);
      shield.uShieldFeather.value = Math.min(160, Math.max(60, width * 0.06)) * dpr;
      shield.uShield.value = tier.contentShield;
    } else {
      shield.uShield.value = 0;
    }

    /* parallax: each layer drifts with the pointer and scroll at its own rate */
    const pointer = journeyState.pointer;
    m.px = damp(m.px, tier.pointer ? pointer.x : 0, 1.2, delta);
    m.py = damp(m.py, tier.pointer ? pointer.y : 0, 1.2, delta);
    const scroll = journeyState.progress.game - 0.5;
    const drift = (factor: number, target: Group | null, baseX = 0, baseY = 0, baseZ = 0) => {
      if (!target) return;
      target.position.set(
        baseX + m.px * 0.012 * factor,
        baseY + m.py * 0.008 * factor - scroll * 0.03 * factor,
        baseZ
      );
    };
    drift(0.35, farRef.current);
    drift(0.6, networkRef.current, layout.network.x, layout.network.y, layout.network.z);
    drift(1, coreRef.current, layout.core.x, layout.core.y, layout.core.z);
    drift(1.8, nearRef.current);

    /* processing structure: slow floating, slow ring turns, a living core */
    const core = coreRef.current;
    if (core) {
      core.position.y += Math.sin(m.clock * 0.22) * 0.004;
      core.rotation.set(0.05 + m.py * 0.04, -0.3 + Math.sin(m.clock * 0.05) * 0.12 + m.px * 0.06, 0.04);
      core.scale.setScalar(layout.core.size);
    }
    CORE_RINGS.slice(0, tier.rings).forEach((ring, i) => {
      const group = ringRefs.current[i];
      if (!group) return;
      group.rotation.set(ring.tilt[0], ring.tilt[1], ring.tilt[2]);
      const spinner = group.children[0];
      if (spinner) spinner.rotation.z = m.flow * ring.spin * 3;
    });
    const coreEnergy = (0.45 + 0.35 * m.activity + 0.35 * select + 0.4 * sync) * wake;
    if (nucleusRef.current) {
      nucleusRef.current.rotation.set(m.clock * 0.06, m.clock * 0.1, 0);
      const breathe = 1 + Math.sin(m.clock * 0.7) * 0.03;
      nucleusRef.current.scale.set(breathe, breathe * 1.35, breathe);
    }

    /* network: slow turn */
    const net = networkRef.current;
    if (net) {
      net.rotation.set(0.12 + m.py * 0.03, m.clock * 0.03 + m.px * 0.05, -0.06);
      net.scale.setScalar(layout.network.size);
    }

    /* materials */
    const w = m.weight;
    materials.glass.opacity = 0.16 * w;
    materials.ring.opacity = 0.9 * w;
    materials.node.opacity = 0.9 * w;
    materials.nucleus.opacity = w;
    materials.nucleus.emissiveIntensity = 0.35 + 1.1 * coreEnergy;
    materials.node.emissive.copy(palette.coolLight).lerp(accent, 0.25);
    materials.node.emissiveIntensity = 0.08 + 0.25 * select + 0.2 * sync;
    const envYaw = (core?.rotation.y ?? 0) * 1.3 + Math.sin(m.clock * 0.03) * 0.2;
    Object.values(materials).forEach((material) => {
      material.envMapRotation.set(0.05, envYaw, 0);
      material.envMapIntensity = 0.7 + 0.4 * wake;
    });

    const links = shaders.links.uniforms;
    links.uTime!.value = m.flow;
    links.uOpacity!.value = w;
    links.uActivity!.value = m.activity;
    links.uSelect!.value = select;
    links.uSync!.value = sync;
    links.uDisturb!.value = failure;
    links.uAccent!.value.copy(palette.coolLight).lerp(accent, 0.35);

    const channel = shaders.channels.uniforms;
    channel.uFlow!.value = m.flow * 0.6;
    channel.uOpacity!.value = 0.36 * w;
    channel.uActivity!.value = m.activity + sync;

    if (core) core.getWorldPosition(scratch);
    [shaders.frames, shaders.coreFrame].forEach((material) => {
      const u = material.uniforms;
      u.uCore!.value.copy(scratch);
      u.uReach!.value = unit * layout.core.size * 0.9;
      u.uEnergy!.value = coreEnergy;
      u.uWake!.value = wake;
      u.uFog!.value.set(ROOT_DISTANCE * 0.9, ROOT_DISTANCE + unit * 3.2);
    });
    shaders.frames.uniforms.uOpacity!.value = 0.05 * w;
    shaders.coreFrame.uniforms.uOpacity!.value = 0.22 * w;

    /* lights — real light from the core and the network */
    const coreWorld = unit * layout.core.size;
    if (coreLightRef.current) {
      coreLightRef.current.distance = coreWorld * 1.6;
      coreLightRef.current.intensity = (1.5 + 3 * coreEnergy) * coreWorld * coreWorld * 0.18 * w;
    }
    const netWorld = unit * layout.network.size;
    if (netLightRef.current) {
      netLightRef.current.distance = netWorld * 1.6;
      netLightRef.current.intensity = (1 + 1.5 * select + 1.2 * sync) * netWorld * netWorld * 0.12 * w;
      netLightRef.current.color.copy(palette.coolLight).lerp(accent, 0.2);
    }

    /* environment (screen space) */
    if (sky) {
      sky.position.copy(camera.position).addScaledVector(forward, 20);
      sky.quaternion.copy(camera.quaternion);
      const far = 2 * Math.tan(((perspective.fov ?? 42) * Math.PI) / 360) * 20;
      sky.scale.set(far * (width / height) * 1.2, far * 1.2, 1);
      const u = shaders.environment.uniforms;
      u.uOpacity!.value = w;
      u.uTime!.value = m.clock;
      u.uWake!.value = wake;
      u.uActivity!.value = m.activity + 0.5 * select;
      u.uWave!.value = wave;
      u.uWaveStrength!.value = successAge;
      u.uDisturb!.value = failure;
      if (core) {
        projected.copy(scratch).project(camera);
        u.uCore!.value.set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5);
      }
      u.uCoreSize!.value = layout.core.size * 0.55;
      if (net) {
        net.getWorldPosition(projected);
        projected.project(camera);
        u.uNet!.value.set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5);
      }
      u.uNetSize!.value = layout.network.size * 0.6;
    }

    /* points */
    const pixelScale = bufferSize.y / (2 * Math.tan(((perspective.fov ?? 42) * Math.PI) / 360));
    shaders.dust.uniforms.uSize!.value = pixelScale * unit;
    shaders.haze.uniforms.uSize!.value = pixelScale * unit;
    shaders.travellers.uniforms.uSize!.value = pixelScale * unit;
    shaders.bokeh.uniforms.uSize!.value = pixelScale * unit;
    shaders.inflow.uniforms.uSize!.value = pixelScale * coreWorld;
    shaders.halos.uniforms.uSize!.value = pixelScale * netWorld;
    const flash = 1 + 0.9 * sync;

    // Fine dust through the whole volume — warm near the core, cool near
    // the network, neutral in between.
    const ds = dust.seed;
    const halfWidth = aspect / 2;
    for (let i = 0; i < dust.count; i += 1) {
      const s = i * 5;
      const o = i * 3;
      const x = ((ds[s]! + m.clock * (0.002 + ds[s + 3]! * 0.004)) % 1) * 2 - 1;
      const y = ((ds[s + 1]! + m.clock * (0.001 + ds[s + 4]! * 0.002)) % 1) - 0.5;
      const px = x * halfWidth * 1.05;
      const z = -0.8 + ds[s + 2]! * 1.05;
      dust.positions[o] = px;
      dust.positions[o + 1] = y * 1.05;
      dust.positions[o + 2] = z;
      const nearCore = Math.exp(-(((px - layout.core.x) ** 2 + (y - layout.core.y) ** 2) / (layout.core.size * layout.core.size * 0.3)));
      const nearNet = Math.exp(-(((px - layout.network.x) ** 2 + (y - layout.network.y) ** 2) / (layout.network.size * layout.network.size * 0.35)));
      tint.copy(palette.neutral).lerp(palette.cool, nearNet).lerp(palette.warm, nearCore * (0.4 + 0.6 * coreEnergy));
      const b = (0.05 + ds[s + 4]! * 0.09) * (1 + nearCore + nearNet * 0.6) * wake * flash;
      dust.colors[o] = tint.r * b;
      dust.colors[o + 1] = tint.g * b;
      dust.colors[o + 2] = tint.b * b;
    }
    markDirty(dustRef.current);

    // Large blurred motes far back — the deepest layer.
    const hs = haze.seed;
    for (let i = 0; i < haze.count; i += 1) {
      const s = i * 4;
      const o = i * 3;
      const rise = (hs[s + 1]! + m.clock * (0.0012 + hs[s + 2]! * 0.0015)) % 1;
      haze.positions[o] = (hs[s]! - 0.5) * aspect * 1.2;
      haze.positions[o + 1] = rise * 1.2 - 0.6;
      haze.positions[o + 2] = -2 - hs[s + 3]! * 1.2;
      const pick = hs[s + 3]!;
      tint.copy(pick < 0.3 ? palette.warm : pick < 0.6 ? palette.violet : palette.cool);
      const b = Math.sin(rise * Math.PI) * (0.012 + hs[s + 2]! * 0.018) * wake;
      haze.colors[o] = tint.r * b;
      haze.colors[o + 1] = tint.g * b;
      haze.colors[o + 2] = tint.b * b;
    }
    markDirty(hazeRef.current);

    // Data points travelling the channels, network → core: cool → warm.
    const ts = travellers.seed;
    for (let i = 0; i < travellers.count; i += 1) {
      const s = i * 3;
      const o = i * 3;
      const curve = channels.curves[Math.floor(ts[s]! * channels.curves.length)];
      if (!curve) continue;
      const t = (ts[s + 1]! + m.flow * (0.025 + ts[s + 2]! * 0.03)) % 1;
      channelPoint(curve, t, projected);
      travellers.positions[o] = projected.x;
      travellers.positions[o + 1] = projected.y;
      travellers.positions[o + 2] = projected.z;
      tint.copy(palette.cool).lerp(palette.warm, smoothstep(0.35, 1, t));
      const b = Math.sin(t * Math.PI) * (0.18 + 0.3 * m.activity) * wake * flash;
      travellers.colors[o] = tint.r * b;
      travellers.colors[o + 1] = tint.g * b;
      travellers.colors[o + 2] = tint.b * b;
    }
    markDirty(travellersRef.current);

    // Data spiralling into the processing core.
    const is = inflow.seed;
    for (let i = 0; i < inflow.count; i += 1) {
      const s = i * 4;
      const o = i * 3;
      const t = (is[s]! + m.flow * (0.06 + is[s + 1]! * 0.06)) % 1;
      const inward = Math.pow(1 - t, 1.3);
      const angle = is[s + 2]! * Math.PI * 2 + t * 3;
      const radius = 0.03 + (0.12 + is[s + 3]! * 0.2) * inward;
      inflow.positions[o] = Math.cos(angle) * radius;
      inflow.positions[o + 1] = (is[s + 3]! - 0.5) * 0.5 * inward;
      inflow.positions[o + 2] = Math.sin(angle) * radius;
      tint.copy(palette.warm).lerp(palette.neutral, inward * 0.4);
      const b = Math.sin(t * Math.PI) * (0.15 + 0.45 * t) * coreEnergy * flash;
      inflow.colors[o] = tint.r * b;
      inflow.colors[o + 1] = tint.g * b;
      inflow.colors[o + 2] = tint.b * b;
    }
    markDirty(inflowRef.current);

    // Network node halos: dim, with an occasional node lighting up.
    for (let i = 0; i < halos.count; i += 1) {
      const cycle = (halos.seed[i]! * 13.7 + m.flow * 0.05) % 1;
      const spark = smoothstep(0.9, 0.95, cycle) * (1 - smoothstep(0.95, 1, cycle));
      tint.copy(palette.cool).lerp(accent, 0.25);
      const b = (0.025 + 0.12 * spark + 0.06 * select + 0.08 * sync) * wake;
      halos.colors[i * 3] = tint.r * b;
      halos.colors[i * 3 + 1] = tint.g * b;
      halos.colors[i * 3 + 2] = tint.b * b;
    }
    markDirty(halosRef.current);

    // Foreground motes — the nearest, softest layer.
    const bs = bokeh.seed;
    for (let i = 0; i < bokeh.count; i += 1) {
      const s = i * 4;
      const o = i * 3;
      const x = ((bs[s]! + m.clock * (0.0015 + bs[s + 2]! * 0.002)) % 1) - 0.5;
      bokeh.positions[o] = x * aspect * 0.95;
      bokeh.positions[o + 1] = (bs[s + 1]! - 0.5) * 0.9;
      bokeh.positions[o + 2] = 0.3 + bs[s + 3]! * 0.2;
      tint.copy(bs[s + 3]! < 0.5 ? palette.cool : palette.warm);
      const b = Math.sin((x + 0.5) * Math.PI) * (0.006 + bs[s + 2]! * 0.008) * wake;
      bokeh.colors[o] = tint.r * b;
      bokeh.colors[o + 1] = tint.g * b;
      bokeh.colors[o + 2] = tint.b * b;
    }
    markDirty(bokehRef.current);

    // Faint light streaks drifting slowly across the near layer.
    streaks.forEach((streak, i) => {
      const mesh = streakRefs.current[i];
      if (!mesh) return;
      const x = ((streak.phase + m.clock * streak.speed) % 1) - 0.5;
      mesh.position.set(x * aspect * 1.4, streak.y, streak.z);
      mesh.scale.set(streak.length, 0.004, 1);
    });
    shaders.streaks.uniforms.uOpacity!.value = 0.05 * w;
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
      <mesh ref={environmentRef} material={shaders.environment} renderOrder={-10} frustumCulled={false} visible={false}>
        <planeGeometry args={[1, 1]} />
      </mesh>

      <group ref={rootRef} visible={false}>
        <group ref={farRef}>
          <lineSegments geometry={farFrames} material={shaders.frames} frustumCulled={false} />
          <points ref={hazeRef} material={shaders.haze} frustumCulled={false}>
            {pointsGeometry(haze)}
          </points>
        </group>

        <group ref={networkRef}>
          <pointLight ref={netLightRef} intensity={0} decay={2} />
          <primitive object={nodes} />
          <lineSegments geometry={network.links} material={shaders.links} frustumCulled={false} />
          <points ref={halosRef} material={shaders.halos} frustumCulled={false}>
            {pointsGeometry(halos)}
          </points>
        </group>

        <mesh geometry={channels.tubes} material={shaders.channels} frustumCulled={false} />
        <points ref={travellersRef} material={shaders.travellers} frustumCulled={false}>
          {pointsGeometry(travellers)}
        </points>

        <group ref={coreRef}>
          <pointLight ref={coreLightRef} color={palette.warmLight} intensity={0} decay={2} />
          <mesh ref={nucleusRef} geometry={geometry.nucleus} material={materials.nucleus} />
          <points ref={inflowRef} material={shaders.inflow} frustumCulled={false}>
            {pointsGeometry(inflow)}
          </points>
          {geometry.rings.map((ring, i) => (
            <group
              key={i}
              ref={(group) => {
                ringRefs.current[i] = group;
              }}
            >
              <group>
                <mesh geometry={ring} material={materials.ring} />
                {[0, Math.PI].map((angle) => (
                  <mesh
                    key={angle}
                    geometry={geometry.bead}
                    material={materials.ring}
                    position={[Math.cos(angle + i) * CORE_RINGS[i]!.radius, Math.sin(angle + i) * CORE_RINGS[i]!.radius, 0]}
                  />
                ))}
              </group>
            </group>
          ))}
          <lineSegments geometry={geometry.coreFrame} material={shaders.coreFrame} frustumCulled={false} />
          <mesh geometry={geometry.capsule} material={materials.glass} renderOrder={2} />
        </group>

        <points ref={dustRef} material={shaders.dust} frustumCulled={false}>
          {pointsGeometry(dust)}
        </points>

        <group ref={nearRef}>
          <points ref={bokehRef} material={shaders.bokeh} frustumCulled={false}>
            {pointsGeometry(bokeh)}
          </points>
          {streaks.map((_, i) => (
            <mesh
              key={i}
              ref={(mesh) => {
                streakRefs.current[i] = mesh;
              }}
              geometry={geometry.streak}
              material={shaders.streaks}
              frustumCulled={false}
            />
          ))}
        </group>
      </group>
    </>
  );
}
