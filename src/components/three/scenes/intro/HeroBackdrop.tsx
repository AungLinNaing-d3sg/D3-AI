"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  IcosahedronGeometry,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
  type IUniform,
} from "three";
import { journeyState } from "@/lib/motion/journeyState";
import { damp } from "@/lib/motion/mathUtils";
import type { SceneQuality } from "@/lib/three/deviceTiers";

/**
 * The world behind the Hero's living D3-SG mark (three/scenes/IntroScene.tsx),
 * so the first screen is never a flat black field:
 *
 * - a living nebula — slow, domain-warped clouds in the brand palette (deep
 *   blue, a warm glow gathered behind the mark, a trace of cyan);
 * - an intelligence sphere — a large wireframe sphere of connected nodes
 *   behind the mark, slowly turning and breathing, with light pulsing out
 *   from its core and sparks running along its edges (an evolution of the
 *   previous Hero's glowing core);
 * - a data horizon — a perspective grid floor dissolving into the distance,
 *   with streaks of light travelling along its lines;
 * - depth dust — a few motes drifting in front, with parallax.
 *
 * Kept low-contrast so the copy stays readable; fades with the Hero's
 * crossfade weight; everything moves in shaders (this loop only writes
 * uniforms). Quality tiers scale the sphere, grid and dust.
 */

const TIER = {
  high: { detail: 3, dust: 260, grid: 1 },
  medium: { detail: 2, dust: 150, grid: 1 },
  low: { detail: 2, dust: 70, grid: 0 },
} as const;

const SPHERE_RADIUS = 2.9;

/* ---- Nebula ---- */

const nebulaVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const nebulaFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec2 uFocus;
  uniform vec2 uParallax;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.02 + 17.3; a *= 0.5; }
    return v;
  }
  void main() {
    vec2 uv = vUv + uParallax;
    vec2 p = uv * vec2(3.2, 1.8);
    float t = uTime * 0.018;
    // Domain-warped clouds, drifting very slowly.
    vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
    vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 1.4), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t));
    float clouds = fbm(p + 3.2 * r);
    vec3 deep = vec3(0.008, 0.012, 0.03);
    vec3 blue = vec3(0.05, 0.085, 0.2);
    vec3 cyan = vec3(0.02, 0.15, 0.2);
    vec3 warm = vec3(0.2, 0.05, 0.035);
    vec3 col = mix(deep, blue, smoothstep(0.35, 0.85, clouds));
    col = mix(col, cyan, smoothstep(0.55, 0.95, r.x) * 0.55);
    // A warm pool of light gathered behind the mark.
    float focus = exp(-dot((uv - uFocus) * vec2(2.6, 3.6), (uv - uFocus) * vec2(2.6, 3.6)) * 2.2);
    col += warm * focus * (0.5 + 0.5 * clouds);
    // Keep the copy side (left) calmer and darker.
    col *= mix(0.55, 1.0, smoothstep(0.1, 0.62, uv.x));
    // Vignette.
    vec2 v = vUv - 0.5;
    col *= 1.0 - dot(v, v) * 1.25;
    gl_FragColor = vec4(col, uOpacity);
  }
`;

/* ---- Intelligence sphere: edges + nodes ---- */

const edgeVertex = /* glsl */ `
  attribute float aEdgeT;
  attribute float aEdgeId;
  uniform float uTime;
  varying float vEdgeT;
  varying float vEdgeId;
  varying float vDepth;
  void main() {
    vEdgeT = aEdgeT;
    vEdgeId = aEdgeId;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const edgeFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uPulse;
  uniform float uNear;
  uniform float uFar;
  varying float vEdgeT;
  varying float vEdgeId;
  varying float vDepth;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    // Nearer edges brighter, far side of the sphere recedes.
    float depthFade = 1.0 - smoothstep(uNear, uFar, vDepth);
    float base = 0.06 + 0.2 * depthFade;
    // A spark running along a few edges at a time.
    float speed = 0.25 + hash(vEdgeId) * 0.5;
    float phase = fract(uTime * speed * 0.35 + hash(vEdgeId * 1.7));
    float lit = step(0.86, hash(vEdgeId * 3.1 + floor(uTime * speed * 0.35 + hash(vEdgeId * 1.7))));
    float spark = exp(-pow((vEdgeT - phase) * 14.0, 2.0)) * lit;
    vec3 col = mix(vec3(0.38, 0.55, 0.9), vec3(0.85, 0.95, 1.0), spark);
    float a = (base + spark * 0.6 * depthFade + uPulse * 0.1 * depthFade) * uOpacity;
    gl_FragColor = vec4(col * a, a);
  }
`;

const nodeVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uPixelRatio;
  uniform float uNear;
  uniform float uFar;
  varying float vAlpha;
  varying float vWarm;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float depthFade = 1.0 - smoothstep(uNear, uFar, -mv.z);
    float blink = pow(0.5 + 0.5 * sin(uTime * (0.5 + aSeed * 1.4) + aSeed * 50.0), 3.0);
    vAlpha = uOpacity * (0.2 + 0.5 * depthFade) * (0.5 + 0.5 * blink);
    vWarm = step(0.8, aSeed);
    gl_PointSize = (2.0 + 2.5 * blink * depthFade) * uPixelRatio * (9.5 / max(-mv.z, 1.0));
    gl_Position = projectionMatrix * mv;
  }
`;

const nodeFragment = /* glsl */ `
  varying float vAlpha;
  varying float vWarm;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float a = exp(-dot(uv, uv) * 16.0) * vAlpha;
    vec3 col = mix(vec3(0.62, 0.8, 1.0), vec3(1.0, 0.6, 0.45), vWarm);
    gl_FragColor = vec4(col * a, a);
  }
`;

/* ---- Core glow + expanding pulse ring ---- */

const pulseFragment = /* glsl */ `
  uniform float uOpacity;
  uniform float uPulse;
  uniform float uRing;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    float core = exp(-r * r * 10.0) * (0.35 + uPulse * 0.35);
    float ring = exp(-pow((r - uRing) * 22.0, 2.0)) * (1.0 - uRing) * 0.5;
    vec3 col = vec3(1.0, 0.45, 0.3) * core + vec3(0.6, 0.8, 1.0) * ring;
    float a = (core + ring) * uOpacity;
    gl_FragColor = vec4(col * uOpacity, a);
  }
`;

/* ---- Data horizon ---- */

const gridVertex = /* glsl */ `
  varying vec3 vWorld;
  varying float vDepth;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mv = viewMatrix * world;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const gridFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec3 vWorld;
  varying float vDepth;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    vec2 g = vWorld.xz * vec2(0.9, 0.9);
    vec2 cell = abs(fract(g - 0.5) - 0.5) / (fwidth(g) * 1.2);
    float line = 1.0 - min(min(cell.x, cell.y), 1.0);
    // Faint surface sheen so the floor reads as one plane, not stray lines.
    float sheen = 0.06;
    // Streaks of light travelling along the depth lines.
    float lane = floor(g.x);
    float lit = step(0.8, hash(lane * 7.3));
    float head = fract(uTime * (0.08 + hash(lane) * 0.1) + hash(lane * 3.1));
    float along = fract(-vWorld.z * 0.05);
    float streak = exp(-pow((along - head) * 18.0, 2.0)) * lit * (1.0 - min(cell.x, 1.0));
    float fade = smoothstep(24.0, 8.0, vDepth) * smoothstep(3.0, 7.0, vDepth);
    vec3 col = vec3(0.3, 0.42, 0.72) * (line * 0.5 + sheen) + vec3(1.0, 0.55, 0.4) * streak;
    float a = (line * 0.16 + sheen * 0.5 + streak * 0.7) * fade * uOpacity;
    gl_FragColor = vec4(col * fade * uOpacity, a);
  }
`;

/* ---- Depth dust ---- */

const dustVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.y += mod(uTime * (0.03 + aSeed * 0.05) + aSeed * 10.0, 8.0) - 4.0;
    p.x += sin(uTime * 0.1 + aSeed * 30.0) * 0.3;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vAlpha = uOpacity * (0.25 + 0.4 * aSeed);
    gl_PointSize = (1.5 + aSeed * 3.0) * uPixelRatio * (6.0 / max(-mv.z, 1.0));
    gl_Position = projectionMatrix * mv;
  }
`;

const dustFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float a = exp(-dot(uv, uv) * 10.0) * vAlpha;
    gl_FragColor = vec4(vec3(0.85, 0.88, 1.0) * a, a);
  }
`;

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

/** Unique edges of an icosphere, as line segments with a 0→1 parameter. */
function buildSphere(detail: number) {
  const ico = new IcosahedronGeometry(SPHERE_RADIUS, detail);
  const pos = ico.attributes.position!;
  // Merge duplicate vertices (non-indexed icosphere).
  const key = (i: number) => `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
  const index = new Map<string, number>();
  const verts: number[] = [];
  const remap: number[] = [];
  for (let i = 0; i < pos.count; i += 1) {
    const k = key(i);
    let id = index.get(k);
    if (id === undefined) {
      id = verts.length / 3;
      index.set(k, id);
      verts.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
    remap.push(id);
  }
  const edges = new Set<string>();
  const segs: number[] = [];
  const edgeT: number[] = [];
  const edgeId: number[] = [];
  let n = 0;
  for (let f = 0; f < remap.length; f += 3) {
    const tri = [remap[f]!, remap[f + 1]!, remap[f + 2]!];
    for (let e = 0; e < 3; e += 1) {
      const a = tri[e]!;
      const b = tri[(e + 1) % 3]!;
      const k = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (edges.has(k)) continue;
      edges.add(k);
      segs.push(verts[a * 3]!, verts[a * 3 + 1]!, verts[a * 3 + 2]!, verts[b * 3]!, verts[b * 3 + 1]!, verts[b * 3 + 2]!);
      edgeT.push(0, 1);
      edgeId.push(n, n);
      n += 1;
    }
  }
  ico.dispose();
  const edgeGeometry = new BufferGeometry();
  edgeGeometry.setAttribute("position", new BufferAttribute(new Float32Array(segs), 3));
  edgeGeometry.setAttribute("aEdgeT", new BufferAttribute(new Float32Array(edgeT), 1));
  edgeGeometry.setAttribute("aEdgeId", new BufferAttribute(new Float32Array(edgeId), 1));
  const rand = mulberry32(3);
  const nodeGeometry = new BufferGeometry();
  nodeGeometry.setAttribute("position", new BufferAttribute(new Float32Array(verts), 3));
  nodeGeometry.setAttribute("aSeed", new BufferAttribute(new Float32Array(verts.length / 3).map(() => rand()), 1));
  return { edgeGeometry, nodeGeometry };
}

export function HeroBackdrop({ quality, anchor, portrait }: { quality: SceneQuality; anchor: Vector3; portrait: boolean }) {
  const tier = TIER[quality];
  const gl = useThree((state) => state.gl);
  const sphereRef = useRef<Group>(null);
  const coreRef = useRef<Group>(null);
  const nebulaRef = useRef<Group>(null);

  const built = useMemo(() => {
    const { edgeGeometry, nodeGeometry } = buildSphere(tier.detail);
    // The sphere sits ~12.7 units from the Hero camera (radius 2.9): near side
    // bright, far side receding.
    const range = { uNear: { value: 10 }, uFar: { value: 15.5 } };
    const time = { value: 0 };
    const opacity = { value: 0 };
    const pulse = { value: 0 };
    const nebula = new ShaderMaterial({
      vertexShader: nebulaVertex,
      fragmentShader: nebulaFragment,
      uniforms: { uTime: time, uOpacity: opacity, uFocus: { value: [0.68, 0.52] }, uParallax: { value: [0, 0] } },
      depthWrite: false,
      transparent: true,
    });
    const edges = new ShaderMaterial({
      vertexShader: edgeVertex,
      fragmentShader: edgeFragment,
      uniforms: { uTime: time, uOpacity: opacity, uPulse: pulse, ...range },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const nodes = new ShaderMaterial({
      vertexShader: nodeVertex,
      fragmentShader: nodeFragment,
      uniforms: { uTime: time, uOpacity: opacity, uPixelRatio: { value: 1 }, ...range },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const core = new ShaderMaterial({
      vertexShader: nebulaVertex,
      fragmentShader: pulseFragment,
      uniforms: { uOpacity: opacity, uPulse: pulse, uRing: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const grid = new ShaderMaterial({
      vertexShader: gridVertex,
      fragmentShader: gridFragment,
      uniforms: { uTime: time, uOpacity: opacity },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const rand = mulberry32(11);
    const dustPos = new Float32Array(tier.dust * 3);
    const dustSeed = new Float32Array(tier.dust);
    for (let i = 0; i < tier.dust; i += 1) {
      dustPos.set([(rand() - 0.5) * 16, (rand() - 0.5) * 8, 1 + rand() * 5], i * 3);
      dustSeed[i] = rand();
    }
    const dustGeometry = new BufferGeometry();
    dustGeometry.setAttribute("position", new BufferAttribute(dustPos, 3));
    dustGeometry.setAttribute("aSeed", new BufferAttribute(dustSeed, 1));
    const dust = new ShaderMaterial({
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      uniforms: { uTime: time, uOpacity: opacity, uPixelRatio: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const plane = new PlaneGeometry(1, 1);
    const gridPlane = new PlaneGeometry(60, 30, 1, 1);
    gridPlane.rotateX(-Math.PI / 2);
    return { edgeGeometry, nodeGeometry, dustGeometry, plane, gridPlane, nebula, edges, nodes, core, grid, dust, time, opacity, pulse };
  }, [tier.detail, tier.dust]);

  useEffect(
    () => () => {
      [built.edgeGeometry, built.nodeGeometry, built.dustGeometry, built.plane, built.gridPlane].forEach((g) => g.dispose());
      [built.nebula, built.edges, built.nodes, built.core, built.grid, built.dust].forEach((m) => m.dispose());
    },
    [built]
  );

  useFrame((state, delta) => {
    const weight = journeyState.weight.intro;
    if (weight <= 0.001) return;
    const time = state.clock.elapsedTime;
    const pr = gl.getPixelRatio();
    built.time.value = time;
    built.opacity.value = Math.min(1, weight * 1.1);
    (built.nodes.uniforms.uPixelRatio as IUniform<number>).value = pr;
    (built.dust.uniforms.uPixelRatio as IUniform<number>).value = pr;

    // A slow heartbeat from the core, with a ring of light expanding out.
    const beat = (time % 5) / 5;
    built.pulse.value = Math.exp(-beat * 6) + 0.2 * (0.5 + 0.5 * Math.sin(time * 0.8));
    (built.core.uniforms.uRing as IUniform<number>).value = Math.min(1, beat * 1.6);

    const px = journeyState.pointer.x;
    const py = journeyState.pointer.y;
    const sphere = sphereRef.current;
    if (sphere) {
      sphere.rotation.y += delta * 0.045;
      sphere.rotation.x = damp(sphere.rotation.x, 0.25 + py * 0.08, 2, delta);
      sphere.rotation.z = Math.sin(time * 0.07) * 0.08;
      sphere.scale.setScalar((portrait ? 0.72 : 1) * (1 + Math.sin(time * 0.6) * 0.012));
      // Deeper than the mark: moves less with the pointer (parallax).
      sphere.position.set(anchor.x + px * 0.05, anchor.y - py * 0.03, -3.2);
      coreRef.current?.position.copy(sphere.position);
      coreRef.current?.scale.setScalar(portrait ? 0.72 : 1);
    }
    const nebula = nebulaRef.current;
    if (nebula) {
      const parallax = built.nebula.uniforms.uParallax!.value as number[];
      parallax[0] = damp(parallax[0] ?? 0, px * 0.006, 2, delta);
      parallax[1] = damp(parallax[1] ?? 0, -py * 0.004, 2, delta);
      const focus = built.nebula.uniforms.uFocus!.value as number[];
      focus[0] = portrait ? 0.5 : 0.68;
      focus[1] = portrait ? 0.72 : 0.52;
    }
  });

  return (
    <group>
      <group ref={nebulaRef}>
        <mesh geometry={built.plane} material={built.nebula} position={[0, 0.4, -16]} scale={[62, 36, 1]} renderOrder={-20} />
      </group>
      {tier.grid ? <mesh geometry={built.gridPlane} material={built.grid} position={[0, -2.9, -12]} renderOrder={-15} /> : null}
      {/* The core's glow faces the camera, so it sits outside the turning sphere. */}
      <group ref={coreRef} position={[anchor.x, anchor.y, -3.2]}>
        <mesh geometry={built.plane} material={built.core} scale={[SPHERE_RADIUS * 2.6, SPHERE_RADIUS * 2.6, 1]} renderOrder={-12} />
      </group>
      <group ref={sphereRef} position={[anchor.x, anchor.y, -3.2]}>
        <lineSegments geometry={built.edgeGeometry} material={built.edges} renderOrder={-11} />
        <points geometry={built.nodeGeometry} material={built.nodes} renderOrder={-10} />
      </group>
      <points geometry={built.dustGeometry} material={built.dust} frustumCulled={false} renderOrder={5} />
    </group>
  );
}
