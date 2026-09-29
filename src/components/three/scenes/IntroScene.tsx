"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineLoop,
  Matrix4,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  Vector3,
  type IUniform,
} from "three";
import { journeyState } from "@/lib/motion/journeyState";
import { damp } from "@/lib/motion/mathUtils";
import { DISCIPLINE_COLORS, heroFocus } from "@/lib/motion/heroFocus";
import { SCENE_TIER_CONFIG, type SceneQuality } from "@/lib/three/deviceTiers";
import { HeroBackdrop } from "@/components/three/scenes/intro/HeroBackdrop";

interface IntroSceneProps {
  quality: SceneQuality;
}

/**
 * Chapter 01 — the Hero: the living D3-SG mark.
 *
 * The real logo (public/D3SG-logo.png — sampled, so its shape and brand
 * colours are exact) rebuilt from thousands of glowing particles with depth:
 * the red slab, the white serif D raised from it, and "3SG". On load they fly
 * in from a scattered cloud and assemble left to right with a soft swirl, on
 * a real-time clock (this is the first thing anyone sees, so it must be
 * complete at rest, before any scrolling). Then it lives: a faint drift and
 * twinkle, and every few seconds a band of light sweeps across the mark.
 *
 * The pointer disturbs it — particles near the cursor scatter away in depth
 * and re-form behind it. Three light trails orbit the mark on tilted paths,
 * passing in front of and behind it: the three disciplines, Data (cyan),
 * Dynamics (amber) and Digital (violet); hovering a discipline in the Hero
 * copy (`heroFocus`) brightens its orbit. Scrolling out of the Hero
 * dissolves the mark back into a cloud as the journey begins. A calm
 * starfield and soft nebula glow sit behind it all.
 *
 * All particle motion is in shaders (one draw call for the mark, one per
 * orbit, one for the stars); this frame loop only writes uniforms. The mark
 * sits right of the copy on landscape screens and above it on portrait ones.
 * Behind it, three/scenes/intro/HeroBackdrop.tsx adds the nebula, the
 * wireframe intelligence sphere, the data horizon and depth dust.
 */

const TIER = {
  high: { logo: 24000, stars: 1800, trail: 90 },
  medium: { logo: 14000, stars: 1100, trail: 64 },
  low: { logo: 8000, stars: 650, trail: 44 },
} as const;

/** Logo width in world units, and where it sits. */
const LOGO_WIDTH = 3.6;
const LANDSCAPE = new Vector3(2.75, 0.25, 0);
const PORTRAIT = new Vector3(0, 1.75, 0);
const ASSEMBLE_DELAY = 0.45;
const ASSEMBLE_DURATION = 2.8;

const ORBITS = [
  { a: 2.55, b: 0.95, tiltX: 1.15, tiltZ: 0.28, speed: 0.34, phase: 0 },
  { a: 2.85, b: 1.15, tiltX: 1.3, tiltZ: -0.42, speed: -0.27, phase: 2.1 },
  { a: 2.3, b: 1.35, tiltX: 0.95, tiltZ: 0.62, speed: 0.22, phase: 4.2 },
];

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

/* ------------------------------------------------------------------ */
/* Shaders                                                              */
/* ------------------------------------------------------------------ */

const logoVertex = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aColor;
  attribute vec4 aSeed; // x: delay, y: size, z: phase, w: swirl
  uniform float uTime;
  uniform float uAssemble;
  uniform float uDisperse;
  uniform float uOpacity;
  uniform float uPixelRatio;
  uniform float uWave;
  uniform float uPointerStrength;
  uniform vec3 uPointer;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vHot;
  void main() {
    vec3 target = position;
    float t = clamp((uAssemble - aSeed.x) / 0.9, 0.0, 1.0);
    float e = 1.0 - pow(1.0 - t, 3.0);
    vec3 p = mix(aStart, target, e);
    // A soft swirl while in flight.
    float flight = sin(t * 3.14159);
    p.x += sin(aSeed.z * 6.28 + uTime * 1.5) * 0.3 * flight * aSeed.w;
    p.y += cos(aSeed.z * 6.28 + uTime * 1.3) * 0.3 * flight * aSeed.w;
    // Alive at rest: a faint individual drift.
    p += vec3(sin(uTime * 0.9 + aSeed.z * 40.0), cos(uTime * 0.7 + aSeed.z * 33.0), sin(uTime * 0.6 + aSeed.z * 21.0)) * 0.006 * e;
    // The cursor scatters nearby particles away, in depth; they re-form behind it.
    vec2 d = p.xy - uPointer.xy;
    float dist = length(d);
    float push = smoothstep(0.7, 0.0, dist) * uPointerStrength * e;
    p.xy += (d / max(dist, 0.0001)) * push * 0.38;
    p.z += push * (0.25 + (aSeed.z - 0.5) * 0.9);
    // Leaving the Hero: back into a drifting cloud.
    float dis = uDisperse * uDisperse;
    p = mix(p, aStart * 1.35 + vec3(0.0, uDisperse * 1.2, 1.2 * uDisperse), dis);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float wave = exp(-pow((target.x - uWave) * 2.4, 2.0));
    vHot = wave * e + push * 0.8;
    vColor = aColor;
    float twinkle = 0.78 + 0.22 * sin(uTime * 2.2 + aSeed.z * 60.0);
    vAlpha = uOpacity * (0.25 + 0.75 * e) * twinkle * (1.0 - dis * 0.6);
    gl_PointSize = aSeed.y * uPixelRatio * (14.0 / max(-mv.z, 1.0)) * (1.0 + vHot * 0.5);
    gl_Position = projectionMatrix * mv;
  }
`;

const logoFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vHot;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv) * 2.0;
    float disc = exp(-r * r * 2.6) * 0.8 + exp(-r * r * 14.0) * 0.35;
    vec3 color = mix(vColor, vec3(1.0, 0.95, 0.9), clamp(vHot * 0.7, 0.0, 0.85));
    float a = disc * vAlpha * 0.62;
    gl_FragColor = vec4(color * a, a);
  }
`;

const trailVertex = /* glsl */ `
  attribute float aT;
  uniform float uTime;
  uniform float uHead;
  uniform float uA;
  uniform float uB;
  uniform float uHighlight;
  uniform float uOpacity;
  uniform float uPixelRatio;
  uniform mat4 uOrbit;
  varying float vAlpha;
  void main() {
    float theta = uHead - aT * 1.6;
    vec3 p = (uOrbit * vec4(cos(theta) * uA, sin(theta) * uB, 0.0, 1.0)).xyz;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float fade = pow(1.0 - aT, 2.2);
    vAlpha = fade * uOpacity * (0.75 + 0.25 * uHighlight);
    gl_PointSize = (1.6 + 4.2 * fade) * (1.0 + uHighlight * 0.5) * uPixelRatio * (9.5 / max(-mv.z, 1.0));
    gl_Position = projectionMatrix * mv;
  }
`;

const trailFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv) * 2.0;
    float a = exp(-r * r * 3.5) * vAlpha;
    gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.25) * a, a);
  }
`;

const starVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed * 1.8) + aSeed * 90.0);
    vAlpha = uOpacity * twinkle * (0.25 + aSeed * 0.6);
    gl_PointSize = (0.8 + aSeed * 1.8) * uPixelRatio;
    gl_Position = projectionMatrix * mv;
  }
`;

const starFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float a = exp(-dot(uv, uv) * 18.0) * vAlpha;
    gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a, a);
  }
`;

const glowVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const glowFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float g = exp(-dot(p, p) * 9.0);
    gl_FragColor = vec4(uColor * g * uIntensity, g * uIntensity);
  }
`;

/* ------------------------------------------------------------------ */
/* Logo sampling                                                        */
/* ------------------------------------------------------------------ */

/** Samples the logo image into particle targets, colours and depth. */
function sampleLogo(image: HTMLImageElement, count: number): BufferGeometry | null {
  const scale = 3;
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const pixels: number[] = [];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if ((data[(y * w + x) * 4 + 3] ?? 0) > 150) pixels.push(x, y);
    }
  }
  const available = pixels.length / 2;
  if (!available) return null;
  const n = Math.min(count, available);
  const rand = mulberry32(42);
  const unit = LOGO_WIDTH / w;
  // The red square spans the left `h` pixels of the logo (it's square).
  const squareRight = h * 1.02;
  const positions = new Float32Array(n * 3);
  const starts = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const seeds = new Float32Array(n * 4);
  const brand = new Color("#f0452f");
  const pearl = new Color("#fff7f0");
  for (let i = 0; i < n; i += 1) {
    const k = Math.floor(rand() * available);
    const px = pixels[k * 2]!;
    const py = pixels[k * 2 + 1]!;
    const o = (py * w + px) * 4;
    const r = (data[o] ?? 0) / 255;
    const g = (data[o + 1] ?? 0) / 255;
    const b = (data[o + 2] ?? 0) / 255;
    const inSquare = px < squareRight;
    // The D is the dark cut-out inside the red square; as light it glows pearl-white.
    const white = inSquare && 0.299 * r + 0.587 * g + 0.114 * b < 0.32;
    const x = (px - w / 2) * unit + (rand() - 0.5) * unit;
    const y = (h / 2 - py) * unit + (rand() - 0.5) * unit;
    // Depth: the slab has thickness, the D is raised from its face, the
    // wordmark is a thinner layer.
    const z = white ? 0.07 + rand() * 0.05 : inSquare ? -0.1 + rand() * 0.16 : -0.05 + rand() * 0.1;
    positions.set([x, y, z], i * 3);
    // Scattered origin: a wide shell around the mark.
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const radius = 3.5 + rand() * 4;
    starts.set([Math.sin(phi) * Math.cos(theta) * radius, Math.sin(phi) * Math.sin(theta) * radius * 0.7, Math.cos(phi) * radius], i * 3);
    const c = white ? pearl : brand;
    colors.set([c.r, c.g, c.b], i * 3);
    // Assemble left → right, with a little randomness.
    const delay = ((x / LOGO_WIDTH + 0.5) * 0.75 + rand() * 0.2) * 0.95;
    seeds.set([delay, (white ? 2.3 : 2.0) + rand() * 1.2, rand(), 0.4 + rand() * 0.8], i * 4);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aStart", new BufferAttribute(starts, 3));
  geometry.setAttribute("aColor", new BufferAttribute(colors, 3));
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 4));
  return geometry;
}

/* ------------------------------------------------------------------ */
/* Scene                                                                */
/* ------------------------------------------------------------------ */

export function IntroScene({ quality }: IntroSceneProps) {
  const tier = TIER[quality];
  const objectScale = SCENE_TIER_CONFIG[quality].objectScale;
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const portrait = size.width / Math.max(size.height, 1) < 1.05;
  const anchor = portrait ? PORTRAIT : LANDSCAPE;

  const rootRef = useRef<Group>(null);
  const markRef = useRef<Group>(null);
  const [logoGeometry, setLogoGeometry] = useState<BufferGeometry | null>(null);

  // Sample the real logo once it has loaded.
  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (cancelled) return;
      setLogoGeometry(sampleLogo(image, tier.logo));
    };
    image.src = "/D3SG-logo.png";
    return () => {
      cancelled = true;
    };
  }, [tier.logo]);

  useEffect(() => () => logoGeometry?.dispose(), [logoGeometry]);

  const logoMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: logoVertex,
        fragmentShader: logoFragment,
        uniforms: {
          uTime: { value: 0 },
          uAssemble: { value: 0 },
          uDisperse: { value: 0 },
          uOpacity: { value: 1 },
          uPixelRatio: { value: 1 },
          uWave: { value: -10 },
          uPointerStrength: { value: 0 },
          uPointer: { value: new Vector3(99, 99, 0) },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    []
  );

  const orbits = useMemo(() => {
    const t = new Float32Array(tier.trail);
    for (let i = 0; i < tier.trail; i += 1) t[i] = i / (tier.trail - 1);
    return ORBITS.map((spec, i) => {
      const matrix = new Matrix4().makeRotationX(spec.tiltX).premultiply(new Matrix4().makeRotationZ(spec.tiltZ));
      const trailGeometry = new BufferGeometry();
      trailGeometry.setAttribute("position", new BufferAttribute(new Float32Array(tier.trail * 3), 3));
      trailGeometry.setAttribute("aT", new BufferAttribute(t, 1));
      const trailMaterial = new ShaderMaterial({
        vertexShader: trailVertex,
        fragmentShader: trailFragment,
        uniforms: {
          uTime: { value: 0 },
          uHead: { value: spec.phase },
          uA: { value: spec.a },
          uB: { value: spec.b },
          uHighlight: { value: 0 },
          uOpacity: { value: 0 },
          uPixelRatio: { value: 1 },
          uOrbit: { value: matrix },
          uColor: { value: new Color(DISCIPLINE_COLORS[i]) },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      // The faint path each light travels along.
      const path = new Float32Array(160 * 3);
      for (let k = 0; k < 160; k += 1) {
        const th = (k / 160) * Math.PI * 2;
        const v = new Vector3(Math.cos(th) * spec.a, Math.sin(th) * spec.b, 0).applyMatrix4(matrix);
        path.set([v.x, v.y, v.z], k * 3);
      }
      const pathGeometry = new BufferGeometry();
      pathGeometry.setAttribute("position", new BufferAttribute(path, 3));
      const pathMaterial = new LineBasicMaterial({ color: DISCIPLINE_COLORS[i], transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending });
      const line = new LineLoop(pathGeometry, pathMaterial);
      return { spec, trailGeometry, trailMaterial, pathGeometry, pathMaterial, line, highlight: 0 };
    });
  }, [tier.trail]);

  const stars = useMemo(() => {
    const rand = mulberry32(7);
    const positions = new Float32Array(tier.stars * 3);
    const seeds = new Float32Array(tier.stars);
    for (let i = 0; i < tier.stars; i += 1) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const radius = 6 + rand() * 9;
      positions.set([Math.sin(phi) * Math.cos(theta) * radius, Math.sin(phi) * Math.sin(theta) * radius, Math.cos(phi) * radius - 6], i * 3);
      seeds[i] = rand();
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    const material = new ShaderMaterial({
      vertexShader: starVertex,
      fragmentShader: starFragment,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    return { geometry, material };
  }, [tier.stars]);

  const glows = useMemo(() => {
    const make = (color: string) =>
      new ShaderMaterial({
        vertexShader: glowVertex,
        fragmentShader: glowFragment,
        uniforms: { uColor: { value: new Color(color) }, uIntensity: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
    return { plane: new PlaneGeometry(1, 1), warm: make("#f14a30"), cool: make("#2bb8d8"), deep: make("#4a5ba6") };
  }, []);

  useEffect(
    () => () => {
      logoMaterial.dispose();
      orbits.forEach((o) => {
        o.trailGeometry.dispose();
        o.trailMaterial.dispose();
        o.pathGeometry.dispose();
        o.pathMaterial.dispose();
      });
      stars.geometry.dispose();
      stars.material.dispose();
      glows.plane.dispose();
      glows.warm.dispose();
      glows.cool.dispose();
      glows.deep.dispose();
    },
    [logoMaterial, orbits, stars, glows]
  );

  const clock = useRef({ start: -1 });
  const pointer = useRef({ ndc: new Vector2(), last: new Vector2(), strength: 0, init: false });
  const tmp = useMemo(() => ({ origin: new Vector3(), dir: new Vector3(), inv: new Matrix4(), ndc: new Vector3(), hit: new Vector3() }), []);

  useFrame((state, delta) => {
    const weight = journeyState.weight.intro;
    const root = rootRef.current;
    const mark = markRef.current;
    if (!root || !mark) return;
    root.visible = weight > 0.001;
    if (!root.visible) return;

    const time = state.clock.elapsedTime;
    const pr = gl.getPixelRatio();
    const progress = journeyState.progress.intro ?? 0;
    if (clock.current.start < 0 && logoGeometry) clock.current.start = time;
    const since = clock.current.start < 0 ? 0 : time - clock.current.start;

    // Assembly on a real clock; dissolve with scroll.
    const assemble = Math.max(0, (since - ASSEMBLE_DELAY) / ASSEMBLE_DURATION) * 1.9;
    const u = logoMaterial.uniforms as Record<string, IUniform>;
    u.uTime!.value = time;
    u.uAssemble!.value = assemble;
    u.uDisperse!.value = Math.min(1, Math.max(0, (progress - 0.4) / 0.6));
    u.uOpacity!.value = Math.min(1, weight * 1.1);
    u.uPixelRatio!.value = pr;
    // A band of light sweeps across the mark every ~6.5 s once assembled.
    const cycle = (since % 6.5) / 6.5;
    u.uWave!.value = since > ASSEMBLE_DELAY + ASSEMBLE_DURATION && cycle < 0.3 ? -2.6 + (cycle / 0.3) * 5.2 : -10;

    // Pointer → the mark's local plane.
    const p = pointer.current;
    const target = journeyState.pointer;
    if (!p.init) {
      p.ndc.set(target.x, -target.y);
      p.last.copy(p.ndc);
      p.init = true;
    }
    p.ndc.x = damp(p.ndc.x, target.x, 9, delta);
    p.ndc.y = damp(p.ndc.y, -target.y, 9, delta);
    const speed = p.ndc.distanceTo(p.last) / Math.max(delta, 1 / 240);
    p.last.copy(p.ndc);
    p.strength = damp(p.strength, Math.min(1, 0.55 + speed * 0.6), speed > 0.02 ? 6 : 1.2, delta);
    tmp.ndc.set(p.ndc.x, p.ndc.y, 0.5).unproject(camera);
    tmp.origin.copy(camera.position);
    tmp.dir.copy(tmp.ndc).sub(tmp.origin).normalize();
    tmp.inv.copy(mark.matrixWorld).invert();
    tmp.origin.applyMatrix4(tmp.inv);
    tmp.dir.transformDirection(tmp.inv);
    const along = -tmp.origin.z / (Math.abs(tmp.dir.z) > 1e-4 ? tmp.dir.z : -1e-4);
    tmp.hit.copy(tmp.origin).addScaledVector(tmp.dir, along);
    (u.uPointer!.value as Vector3).copy(tmp.hit);
    u.uPointerStrength!.value = p.strength;

    // The mark: placed for the screen shape, floating, turning towards the viewer's side.
    const px = target.x;
    const py = target.y;
    mark.position.set(anchor.x + px * 0.12, anchor.y + Math.sin(time * 0.5) * 0.06 - py * 0.08, anchor.z);
    mark.rotation.y = damp(mark.rotation.y, Math.sin(time * 0.23) * 0.14 + px * 0.22, 2.5, delta);
    mark.rotation.x = damp(mark.rotation.x, Math.sin(time * 0.19) * 0.05 + py * 0.12, 2.5, delta);
    mark.scale.setScalar((portrait ? 0.78 : 1) * (1 + Math.sin(time * 0.8) * 0.006));

    // Discipline orbits.
    const assembled = Math.min(1, Math.max(0, (since - ASSEMBLE_DELAY - 1.2) / 1.6));
    orbits.forEach((o, i) => {
      o.highlight = damp(o.highlight, heroFocus.discipline === i ? 1 : 0, 6, delta);
      const ou = o.trailMaterial.uniforms as Record<string, IUniform>;
      ou.uHead!.value = o.spec.phase + time * o.spec.speed * (1 + o.highlight * 0.6);
      ou.uHighlight!.value = o.highlight;
      ou.uOpacity!.value = assembled * weight * (1 - u.uDisperse!.value * 0.8) * (heroFocus.discipline >= 0 && heroFocus.discipline !== i ? 0.45 : 1);
      ou.uPixelRatio!.value = pr;
      o.pathMaterial.opacity = assembled * weight * (0.07 + o.highlight * 0.25);
    });

    // Atmosphere.
    const su = stars.material.uniforms as Record<string, IUniform>;
    su.uTime!.value = time;
    su.uOpacity!.value = weight;
    su.uPixelRatio!.value = pr;
    root.rotation.y = Math.sin(time * 0.03) * 0.04;
    (glows.warm.uniforms.uIntensity as IUniform<number>).value = 0.26 * weight * (0.85 + 0.15 * Math.sin(time * 0.6));
    (glows.cool.uniforms.uIntensity as IUniform<number>).value = 0.13 * weight;
    (glows.deep.uniforms.uIntensity as IUniform<number>).value = 0.16 * weight;
  });

  return (
    <group ref={rootRef} scale={objectScale} visible={false}>
      {/* The world behind the mark: nebula, intelligence sphere, data horizon, dust. */}
      <HeroBackdrop quality={quality} anchor={anchor} portrait={portrait} />
      <points geometry={stars.geometry} material={stars.material} frustumCulled={false} />
      <mesh geometry={glows.plane} material={glows.deep} position={[-3.5, 1.2, -8]} scale={[16, 11, 1]} />
      <group ref={markRef}>
        <mesh geometry={glows.plane} material={glows.warm} position={[0, 0, -1.4]} scale={[7.5, 4.8, 1]} />
        <mesh geometry={glows.plane} material={glows.cool} position={[1.4, -0.9, -2]} scale={[6, 4, 1]} />
        {orbits.map((o, i) => (
          <group key={i}>
            <primitive object={o.line} />
            <points geometry={o.trailGeometry} material={o.trailMaterial} frustumCulled={false} />
          </group>
        ))}
        {logoGeometry ? <points geometry={logoGeometry} material={logoMaterial} frustumCulled={false} /> : null}
      </group>
    </group>
  );
}
