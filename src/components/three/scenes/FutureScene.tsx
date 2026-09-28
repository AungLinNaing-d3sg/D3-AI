"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  DodecahedronGeometry,
  FogExp2,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Object3D,
  PlaneGeometry,
  PointLight,
  ShaderMaterial,
  SpotLight,
  Vector2,
  Vector3,
  Vector4,
  type IUniform,
} from "three";
import { journeyState } from "@/lib/motion/journeyState";
import { damp } from "@/lib/motion/mathUtils";
import { SCENE_TIER_CONFIG, type SceneQuality } from "@/lib/three/deviceTiers";
import {
  backdropFragment,
  backdropVertex,
  beamFragment,
  beamVertex,
  bubbleFragment,
  bubbleVertex,
  fishFragment,
  fishVertex,
  floorFragment,
  floorVertex,
  OCEAN_FOG_COLOR,
  particleFragment,
  particleVertex,
  plantFragment,
  plantVertex,
  rockFragment,
  rockVertex,
} from "@/components/three/scenes/ocean/oceanShaders";
import { OceanLogo, useOceanLogoMaterials, type OceanLogoUniforms } from "@/components/three/scenes/ocean/OceanLogo";

interface FutureSceneProps {
  quality: SceneQuality;
}

/**
 * Chapter 07 — Our vision, as a deep-ocean world: "an intelligent AI world
 * submerged beneath a living ocean, where light, data and organic life
 * interact around the D3-SG identity".
 *
 * Back to front: the abyss (a lit surface far above, faint kelp-forest
 * silhouettes), distant fish silhouettes gliding through the light, soft
 * shafts of light from the surface, an uneven sandy floor with rocks and
 * soft coral, swaying kelp/grass/leaves (one instanced mesh, animated on
 * the GPU), suspended dust that lights up where the shafts pass, sparse
 * bioluminescent plankton, the odd rising bubble — and the D3-SG mark as a
 * physical object (three/scenes/ocean/OceanLogo.tsx) lit by the scene: a
 * slowly sweeping overhead spot, cyan and violet side lights, a rim light
 * and moving caustics, so reflections travel across it rather than it
 * glowing on its own.
 *
 * The pointer is an underwater current: plants within reach bend away and
 * their tips glow faintly, matter and plankton scatter, bubbles drift aside
 * — strongest closest, stronger with speed, easing back after. Scroll
 * progress through the chapter moves the light and current; entering and
 * leaving crossfade on `journeyState.weight.future` (animation time never
 * restarts). Everything continuous runs in shaders or this one frame loop —
 * no per-frame React state — and the scene goes idle at zero weight.
 * Quality tiers scale plant/particle counts; reduced motion never mounts
 * the shared canvas (FutureSection shows a static ocean instead).
 */

const TIER = {
  high: { plants: 120, rocks: 16, coral: 12, dust: 1300, plankton: 60, bubbles: 16, beams: 6, fish: 3 },
  medium: { plants: 72, rocks: 11, coral: 8, dust: 700, plankton: 36, bubbles: 10, beams: 5, fish: 2 },
  low: { plants: 40, rocks: 7, coral: 5, dust: 360, plankton: 20, bubbles: 6, beams: 4, fish: 1 },
} as const;

const FLOOR_Y = -2.5;
/** Where the mark sits: in the open water beside the heading (upper right)
 * on landscape screens. */
const LOGO_LANDSCAPE = new Vector3(1.85, 0.95, -1.4);
/** Portrait screens: right under the header, where the copy only passes briefly. */
const LOGO_PHONE = new Vector3(0, 2.75, -1.8);
/** Light shafts: x, z, width, tilt, phase, strength. */
const BEAMS = [
  { x: -0.25, z: -2.2, w: 1.5, tilt: 0.1, phase: 0.0, strength: 1 },
  { x: 1.4, z: -3.4, w: 1.1, tilt: -0.08, phase: 1.7, strength: 0.75 },
  { x: -1.9, z: -4.2, w: 1.2, tilt: 0.14, phase: 3.1, strength: 0.7 },
  { x: 0.6, z: -6, w: 1.9, tilt: 0.05, phase: 4.4, strength: 0.6 },
  { x: 3.1, z: -5.2, w: 1.2, tilt: -0.12, phase: 5.2, strength: 0.5 },
  { x: -3.4, z: -6.8, w: 1.6, tilt: 0.16, phase: 2.4, strength: 0.45 },
];

/** Deterministic PRNG — the same composition on every load. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function common(): Record<string, IUniform> {
  return {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uFogColor: { value: new Color(OCEAN_FOG_COLOR) },
    uFogDensity: { value: 0.11 },
    uSweep: { value: -40 },
    uRayOrigin: { value: new Vector3(0, 0, 10) },
    uRayDir: { value: new Vector3(0, 0, -1) },
    uCurrent: { value: 0 },
    uCaustic: { value: 1 },
  };
}

export function FutureScene({ quality }: FutureSceneProps) {
  const tier = TIER[quality];
  const size = useThree((state) => state.size);
  const portrait = size.width / Math.max(size.height, 1) < 1.05;
  // Portrait screens stack the copy full-width, so the mark sits softened
  // under the header there, where the copy only passes briefly.
  const LOGO_POSITION = portrait ? LOGO_PHONE : LOGO_LANDSCAPE;
  const objectScale = SCENE_TIER_CONFIG[quality].objectScale;
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);

  const rootRef = useRef<Group>(null);
  const farLayer = useRef<Group>(null);
  const midLayer = useRef<Group>(null);
  const logoRef = useRef<Group>(null);
  const beamMaterials = useRef<ShaderMaterial[]>([]);

  const fog = useMemo(() => new FogExp2(OCEAN_FOG_COLOR, 0), []);

  /** One shared set of uniforms (time, fog, sweep, pointer ray, current…). */
  const shared = useMemo(() => common(), []);
  const logoUniforms = shared as unknown as OceanLogoUniforms;
  const logoMaterials = useOceanLogoMaterials(logoUniforms);

  const materials = useMemo(() => {
    const make = (vertexShader: string, fragmentShader: string, extra: Record<string, IUniform> = {}, opts: Partial<ShaderMaterial> = {}) =>
      Object.assign(
        new ShaderMaterial({ vertexShader, fragmentShader, uniforms: { ...shared, ...extra }, transparent: true }),
        opts
      );
    return {
      backdrop: make(backdropVertex, backdropFragment, {}, { depthWrite: false }),
      floor: make(floorVertex, floorFragment, { uLightX: { value: 0 } }),
      plants: make(plantVertex, plantFragment, { uLean: { value: 0 } }, { side: DoubleSide }),
      rocks: make(rockVertex, rockFragment),
      particles: make(
        particleVertex,
        particleFragment,
        {
          uPixelRatio: { value: 1 },
          uMinY: { value: FLOOR_Y },
          uSpanY: { value: 6.4 },
          uBeams: { value: BEAMS.map((b) => new Vector4(b.x, b.z, b.w * 0.55, b.strength)) },
        },
        { depthWrite: false, blending: AdditiveBlending }
      ),
      bubbles: make(bubbleVertex, bubbleFragment, { uPixelRatio: { value: 1 }, uMinY: { value: FLOOR_Y + 0.2 }, uSpanY: { value: 5.2 } }, { depthWrite: false, blending: AdditiveBlending }),
      fish: new ShaderMaterial({ vertexShader: fishVertex, fragmentShader: fishFragment, uniforms: { uTime: shared.uTime!, uOpacity: shared.uOpacity! }, transparent: true, depthWrite: false }),
    };
  }, [shared]);

  /* ---- Geometry (deterministic layouts) ---- */

  const floorGeometry = useMemo(() => {
    const g = new PlaneGeometry(44, 30, quality === "low" ? 70 : 130, quality === "low" ? 50 : 90);
    g.rotateX(-Math.PI / 2);
    g.translate(0, FLOOR_Y, -8);
    return g;
  }, [quality]);

  const plants = useMemo(() => {
    const rand = mulberry32(7);
    const geometry = new PlaneGeometry(1, 1, 1, quality === "low" ? 8 : 14);
    geometry.translate(0, 0.5, 0);
    const mesh = new InstancedMesh(geometry, materials.plants, tier.plants);
    const phase = new Float32Array(tier.plants);
    const freq = new Float32Array(tier.plants);
    const amp = new Float32Array(tier.plants);
    const tint = new Float32Array(tier.plants);
    const dummy = new Object3D();
    const layout: { x: number; z: number; kind: number }[] = [];
    while (layout.length < tier.plants) {
      const x = (rand() - 0.5) * 15;
      const z = -9.5 + rand() * 11;
      // Keep the space in front of the logo clear.
      if (x > -1.6 && x < 3.4 && z > -2.6 && z < 0) continue;
      layout.push({ x, z, kind: rand() });
    }
    // Far first, so the instanced draw blends back to front.
    layout.sort((a, b) => a.z - b.z);
    layout.forEach((p, i) => {
      // Kelp (tall ribbons), sea grass (thin, short) or broad soft leaves.
      const kind = p.kind < 0.45 ? "kelp" : p.kind < 0.8 ? "grass" : "leaf";
      const depthBoost = 1 + Math.max(0, -p.z - 3) * 0.12;
      const height = (kind === "kelp" ? 1.6 + rand() * 1.8 : kind === "grass" ? 0.35 + rand() * 0.6 : 0.6 + rand() * 0.7) * depthBoost;
      const width = kind === "kelp" ? 0.09 + rand() * 0.07 : kind === "grass" ? 0.025 + rand() * 0.03 : 0.16 + rand() * 0.1;
      dummy.position.set(p.x, FLOOR_Y + 0.12, p.z);
      dummy.rotation.set(0, rand() * Math.PI, (rand() - 0.5) * 0.25);
      dummy.scale.set(width, height, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      phase[i] = rand() * Math.PI * 2;
      freq[i] = kind === "kelp" ? 0.35 + rand() * 0.3 : 0.6 + rand() * 0.7;
      amp[i] = kind === "kelp" ? 0.18 + rand() * 0.2 : 0.05 + rand() * 0.08;
      tint[i] = rand() < 0.16 ? 0.7 + rand() * 0.3 : rand() * 0.15;
    });
    geometry.setAttribute("aPhase", new InstancedBufferAttribute(phase, 1));
    geometry.setAttribute("aFreq", new InstancedBufferAttribute(freq, 1));
    geometry.setAttribute("aAmp", new InstancedBufferAttribute(amp, 1));
    geometry.setAttribute("aTint", new InstancedBufferAttribute(tint, 1));
    mesh.frustumCulled = false;
    return mesh;
  }, [materials.plants, quality, tier.plants]);

  const rocks = useMemo(() => {
    const rand = mulberry32(21);
    const count = tier.rocks + tier.coral;
    const geometry = new DodecahedronGeometry(1, 1);
    const coralGeometry = new IcosahedronGeometry(1, 2);
    const make = (geo: BufferGeometry, n: number, isCoral: boolean) => {
      const mesh = new InstancedMesh(geo, materials.rocks, n);
      const tints = new Float32Array(n);
      const dummy = new Object3D();
      for (let i = 0; i < n; i += 1) {
        let x = 0;
        let z = 0;
        do {
          x = (rand() - 0.5) * 13;
          z = -8.5 + rand() * 9;
        } while (Math.abs(x) < 1.4 && z > -2.4);
        const s = isCoral ? 0.08 + rand() * 0.16 : 0.18 + rand() * 0.5;
        dummy.position.set(x, FLOOR_Y + s * 0.35, z);
        dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
        dummy.scale.set(s * (1 + rand() * 0.6), s * (isCoral ? 1.2 : 0.55 + rand() * 0.3), s * (1 + rand() * 0.4));
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        tints[i] = isCoral ? 0.6 + rand() * 0.4 : rand() * 0.08;
      }
      geo.setAttribute("aTint", new InstancedBufferAttribute(tints, 1));
      return mesh;
    };
    return { stones: make(geometry, tier.rocks, false), coral: make(coralGeometry, tier.coral, true), count };
  }, [materials.rocks, tier.rocks, tier.coral]);

  const particles = useMemo(() => {
    const rand = mulberry32(99);
    const total = tier.dust + tier.plankton;
    const positions = new Float32Array(total * 3);
    const seeds = new Float32Array(total * 3);
    const sizes = new Float32Array(total);
    const kinds = new Float32Array(total);
    for (let i = 0; i < total; i += 1) {
      const plankton = i >= tier.dust;
      positions[i * 3] = (rand() - 0.5) * (plankton ? 11 : 16);
      positions[i * 3 + 1] = FLOOR_Y + rand() * 6.4;
      // Denser near the middle distance; a few close to the lens.
      positions[i * 3 + 2] = plankton ? -7 + rand() * 7.5 : -11 + Math.pow(rand(), 0.7) * 14;
      seeds[i * 3] = rand();
      seeds[i * 3 + 1] = rand();
      seeds[i * 3 + 2] = rand();
      // Mostly fine dust, with the odd larger mote.
      sizes[i] = plankton ? 2.4 + rand() * 2.2 : rand() < 0.93 ? 0.9 + rand() * 1.4 : 2.2 + rand() * 1.8;
      kinds[i] = plankton ? 1 : 0;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new BufferAttribute(seeds, 3));
    g.setAttribute("aSize", new BufferAttribute(sizes, 1));
    g.setAttribute("aKind", new BufferAttribute(kinds, 1));
    return g;
  }, [tier.dust, tier.plankton]);

  const bubbles = useMemo(() => {
    const rand = mulberry32(5);
    const positions = new Float32Array(tier.bubbles * 3);
    const seeds = new Float32Array(tier.bubbles * 3);
    for (let i = 0; i < tier.bubbles; i += 1) {
      positions[i * 3] = (rand() - 0.5) * 11;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = -7 + rand() * 7;
      seeds[i * 3] = rand();
      seeds[i * 3 + 1] = rand() * 10;
      seeds[i * 3 + 2] = rand();
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new BufferAttribute(seeds, 3));
    return g;
  }, [tier.bubbles]);

  const fish = useMemo(() => {
    const geometry = new PlaneGeometry(1, 0.42);
    const mesh = new InstancedMesh(geometry, materials.fish, Math.max(1, tier.fish));
    geometry.setAttribute("aPhase", new InstancedBufferAttribute(new Float32Array([0.1, 0.5, 0.83]).slice(0, Math.max(1, tier.fish)), 1));
    mesh.frustumCulled = false;
    return mesh;
  }, [materials.fish, tier.fish]);

  const beamGeometry = useMemo(() => {
    const g = new PlaneGeometry(1, 1, 1, 12);
    g.translate(0, -0.5, 0);
    return g;
  }, []);

  /* ---- Lights (inside the chapter; intensities follow its weight) ---- */

  const lights = useMemo(() => {
    const spot = new SpotLight("#c8f3ff", 0, 14, 0.55, 0.85, 1.4);
    const hemi = new HemisphereLight("#2b8fae", "#02080b", 0);
    const cyan = new PointLight("#46e3ff", 0, 7, 1.6);
    const violet = new PointLight("#8b6bff", 0, 7, 1.6);
    const rim = new PointLight("#bdf2ff", 0, 6, 1.4);
    const local = new PointLight("#56d8e6", 0, 3.2, 1.8);
    spot.target.position.copy(LOGO_POSITION);
    return { spot, hemi, cyan, violet, rim, local };
  }, [LOGO_POSITION]);

  useEffect(
    () => () => {
      Object.values(materials).forEach((m) => m.dispose());
      logoMaterials.all.forEach((m) => m.dispose());
      floorGeometry.dispose();
      plants.geometry.dispose();
      rocks.stones.geometry.dispose();
      rocks.coral.geometry.dispose();
      particles.dispose();
      bubbles.dispose();
      fish.geometry.dispose();
      beamGeometry.dispose();
    },
    [materials, logoMaterials, floorGeometry, plants, rocks, particles, bubbles, fish, beamGeometry]
  );

  /* ---- Frame loop ---- */

  const pointerState = useRef({ ndc: new Vector2(0, 0), last: new Vector2(0, 0), current: 0, init: false });
  const tmp = useMemo(() => ({ origin: new Vector3(), dir: new Vector3(), inv: new Matrix4(), ndc: new Vector3() }), []);
  const fishMatrix = useMemo(() => new Object3D(), []);

  useFrame((state, delta) => {
    const weight = journeyState.weight.future;
    const root = rootRef.current;
    const active = weight > 0.001;
    if (root) root.visible = active;

    // Fog hand-off (the same pattern the other chapters use).
    if (active) {
      scene.fog = fog;
      fog.density = damp(fog.density, 0.075 * weight, 3, delta);
    } else if (scene.fog === fog) {
      fog.density = damp(fog.density, 0, 3, delta);
      if (fog.density < 0.002) scene.fog = null;
    }
    if (!active || !root) return;

    const time = state.clock.elapsedTime;
    const progress = journeyState.progress.future ?? 0;
    shared.uTime!.value = time;
    shared.uOpacity!.value = Math.min(1, weight * 1.15);

    // The occasional brighter sweep of light across the scene (every ~11s).
    const sweepCycle = (time % 11) / 11;
    shared.uSweep!.value = sweepCycle < 0.45 ? -9 + (sweepCycle / 0.45) * 18 : -40;

    // Pointer → an underwater current (ray in the chapter's local space).
    const p = pointerState.current;
    const target = journeyState.pointer;
    if (!p.init) {
      p.ndc.set(target.x, -target.y);
      p.last.copy(p.ndc);
      p.init = true;
    }
    p.ndc.x = damp(p.ndc.x, target.x, 6, delta);
    p.ndc.y = damp(p.ndc.y, -target.y, 6, delta);
    const speed = p.ndc.distanceTo(p.last) / Math.max(delta, 1 / 240);
    p.last.copy(p.ndc);
    p.current = damp(p.current, Math.min(1, 0.3 + speed * 0.45), speed > p.current ? 5 : 1.4, delta);
    tmp.ndc.set(p.ndc.x, p.ndc.y, 0.5).unproject(camera);
    tmp.origin.copy(camera.position);
    tmp.dir.copy(tmp.ndc).sub(tmp.origin).normalize();
    tmp.inv.copy(root.matrixWorld).invert();
    tmp.origin.applyMatrix4(tmp.inv);
    tmp.dir.transformDirection(tmp.inv);
    (shared.uRayOrigin!.value as Vector3).copy(tmp.origin);
    (shared.uRayDir!.value as Vector3).copy(tmp.dir);
    shared.uCurrent!.value = p.current;

    // Scroll: light and current move through the chapter.
    const lightX = Math.sin(time * 0.11) * 0.9 + (progress - 0.5) * 1.2;
    (materials.floor.uniforms.uLightX as IUniform<number>).value = lightX;
    (materials.plants.uniforms.uLean as IUniform<number>).value = (progress - 0.5) * 0.18;
    (materials.particles.uniforms.uPixelRatio as IUniform<number>).value = gl.getPixelRatio();
    (materials.bubbles.uniforms.uPixelRatio as IUniform<number>).value = gl.getPixelRatio();
    beamMaterials.current.forEach((m, i) => {
      m.uniforms.uTime!.value = time;
      m.uniforms.uIntensity!.value = (BEAMS[i]?.strength ?? 0.5) * 0.85 * weight * (0.85 + 0.15 * Math.sin(time * 0.3 + i));
    });

    // Parallax layers: background least, the logo most.
    const px = target.x;
    const py = target.y;
    if (farLayer.current) farLayer.current.position.set(-px * 0.12, py * 0.06, 0);
    if (midLayer.current) midLayer.current.position.set(-px * 0.25, py * 0.1, 0);
    // A slow, barely-there drift of the whole world (camera-like).
    root.rotation.y = Math.sin(time * 0.05) * 0.025;
    root.position.y = Math.sin(time * 0.07) * 0.04;

    // The logo: floats, turns a few degrees, and leans towards the viewer's side.
    const logo = logoRef.current;
    if (logo) {
      logo.position.set(LOGO_POSITION.x + px * 0.18, LOGO_POSITION.y + Math.sin(time * 0.45) * 0.06 - py * 0.08, LOGO_POSITION.z);
      logo.rotation.y = damp(logo.rotation.y, Math.sin(time * 0.21) * 0.16 + px * 0.12, 2, delta);
      logo.rotation.x = damp(logo.rotation.x, Math.sin(time * 0.17) * 0.05 - py * 0.05, 2, delta);
      logo.scale.setScalar((portrait ? 0.58 : 0.7) + weight * 0.06);
    }
    // On phones the copy scrolls over the fixed scene, so the mark stays
    // softer there to keep every line readable.
    const logoOpacity = Math.min(1, weight * 1.3) * (portrait ? 0.42 : 1);
    logoMaterials.all.forEach((m) => {
      m.opacity = logoOpacity;
    });

    // Lights: the overhead spot sweeps slowly; cyan and violet pass across the mark.
    const w = weight;
    lights.spot.position.set(LOGO_POSITION.x + lightX * 0.8, 5.2, LOGO_POSITION.z + 0.8);
    lights.spot.intensity = 48 * w;
    lights.hemi.intensity = 0.55 * w;
    lights.cyan.position.set(LOGO_POSITION.x - 2 + Math.sin(time * 0.23) * 1.2, LOGO_POSITION.y + 0.5 + Math.sin(time * 0.31) * 0.5, 0.6);
    lights.cyan.intensity = (5 + 3 * Math.max(0, Math.sin(time * 0.23))) * w;
    lights.violet.position.set(LOGO_POSITION.x + 2 + Math.sin(time * 0.19 + 2) * 1.1, LOGO_POSITION.y - 0.4 + Math.cos(time * 0.27) * 0.5, 0.4);
    lights.violet.intensity = (3.2 + 2.2 * Math.max(0, Math.sin(time * 0.19 + 2))) * w;
    lights.rim.position.set(LOGO_POSITION.x + Math.sin(time * 0.13) * 0.8, LOGO_POSITION.y + 1.2, LOGO_POSITION.z - 1.4);
    lights.rim.intensity = 6 * w;
    lights.local.position.set(-2.8, FLOOR_Y + 0.6, -1.4);
    lights.local.intensity = 1.6 * w;

    // Distant fish, gliding through the light now and then.
    for (let i = 0; i < fish.count; i += 1) {
      const period = 38 + i * 11;
      const t = ((time + i * 17) % period) / period;
      const dir = i % 2 === 0 ? 1 : -1;
      fishMatrix.position.set(dir * (-12 + t * 24), 1.2 + i * 0.55 + Math.sin(time * 0.3 + i) * 0.2, -9.5 + i * 0.6);
      fishMatrix.scale.set(dir * (0.7 + i * 0.15), 0.7 + i * 0.15, 1);
      fishMatrix.rotation.set(0, 0, Math.sin(time * 0.4 + i) * 0.05);
      fishMatrix.updateMatrix();
      fish.setMatrixAt(i, fishMatrix.matrix);
    }
    fish.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={rootRef} scale={objectScale} visible={false}>
      {/* Lights belong to this chapter and fade with it. */}
      <primitive object={lights.spot} />
      <primitive object={lights.spot.target} />
      <primitive object={lights.hemi} />
      <primitive object={lights.cyan} />
      <primitive object={lights.violet} />
      <primitive object={lights.rim} />
      <primitive object={lights.local} />

      <group ref={farLayer}>
        <mesh position={[0, 1.6, -15]} material={materials.backdrop} renderOrder={-10}>
          <planeGeometry args={[70, 34]} />
        </mesh>
        <primitive object={fish} renderOrder={-9} />
        {BEAMS.slice(0, tier.beams).map((beam, i) => (
          <mesh
            key={i}
            geometry={beamGeometry}
            position={[beam.x, 5.4, beam.z]}
            rotation={[0, 0, beam.tilt]}
            scale={[beam.w * 1.35, 9, 1]}
            renderOrder={-5}
          >
            <shaderMaterial
              ref={(m) => {
                if (m) beamMaterials.current[i] = m;
              }}
              vertexShader={beamVertex}
              fragmentShader={beamFragment}
              uniforms={{
                uTime: { value: 0 },
                uPhase: { value: beam.phase },
                uIntensity: { value: 0 },
                uColor: { value: new Color(i % 3 === 2 ? "#9fb8ff" : "#aef3ff") },
              }}
              transparent
              depthWrite={false}
              blending={AdditiveBlending}
              side={DoubleSide}
            />
          </mesh>
        ))}
      </group>

      <group ref={midLayer}>
        <mesh geometry={floorGeometry} material={materials.floor} />
        <primitive object={rocks.stones} />
        <primitive object={rocks.coral} />
        <primitive object={plants} />
      </group>

      <points geometry={particles} material={materials.particles} frustumCulled={false} />
      <points geometry={bubbles} material={materials.bubbles} frustumCulled={false} />

      <OceanLogo ref={logoRef} materials={logoMaterials} />
    </group>
  );
}
