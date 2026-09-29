"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  type IUniform,
} from "three";
import { journeyState } from "@/lib/motion/journeyState";
import { STAGE_IDS, type StageId } from "@/types";
import type { SceneQuality } from "@/lib/three/deviceTiers";

/**
 * The site-wide ambient world — one continuous layer under every chapter's
 * own scene, so the page never falls back to a flat black field between or
 * behind them:
 *
 * - a deep nebula sky around the camera, whose palette glides from chapter
 *   to chapter with the scroll crossfade (deep blue/ember for the Hero, warm
 *   amber for About, orange for Our Approach, cyan for How We Think, indigo
 *   for By the Numbers, violet for the Playground, ember again for the CTA);
 * - three layers of stars that twinkle and stream gently towards the viewer
 *   as the page is scrolled, for a sense of travel;
 * - soft, out-of-focus bokeh motes drifting through, tinted by the chapter;
 * - now and then, a streak of light arcing across the sky.
 *
 * It follows the camera (so it's always there, whatever the camera does),
 * stays dim so every chapter's copy remains readable, and fades out under
 * the underwater Vision chapter (which brings its own world). Everything
 * moves in shaders — this loop only writes a few uniforms.
 */

const TIER = {
  high: { stars: 2600, bokeh: 70, octaves: 5, streaks: 3 },
  medium: { stars: 1500, bokeh: 42, octaves: 4, streaks: 2 },
  low: { stars: 800, bokeh: 22, octaves: 3, streaks: 1 },
} as const;

/** Per chapter: nebula base, nebula glow, accent (bokeh/streak tint). */
const PALETTE: Record<StageId, [string, string, string]> = {
  intro: ["#070c1f", "#3a1410", "#ff8a6a"],
  about: ["#0d0a14", "#3a2412", "#f0c27a"],
  typography: ["#0b0a16", "#3d1a10", "#ff9b73"],
  neural: ["#051420", "#0b3a44", "#7fe8f5"],
  universe: ["#080a22", "#1e1f55", "#a6b4ff"],
  game: ["#0a0a1a", "#26194a", "#c3b2ff"],
  future: ["#03151b", "#07323a", "#9ff0f5"],
  cta: ["#0c0710", "#3c1510", "#ff9a78"],
};

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

/* ---- Sky ---- */

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = (octaves: number) => /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uScroll;
  uniform vec3 uBase;
  uniform vec3 uGlow;
  uniform vec3 uAccent;
  varying vec3 vDir;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), u.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), u.x), u.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), u.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), u.x), u.y),
      u.z);
  }
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < ${octaves}; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
    return v;
  }
  void main() {
    vec3 d = normalize(vDir);
    float t = uTime * 0.012;
    // Clouds drift slowly, and turn a little as the page is scrolled.
    vec3 p = d * 2.4 + vec3(t, uScroll * 0.6, -t * 0.7);
    vec3 warp = vec3(fbm(p + 3.1), fbm(p + 7.7), fbm(p + 1.3));
    float clouds = fbm(p + warp * 1.8);
    float wisps = smoothstep(0.52, 0.9, fbm(p * 2.2 + warp * 2.6 - t * 2.0));
    vec3 col = uBase;
    col += uGlow * smoothstep(0.3, 0.9, clouds) * 1.7;
    col += uAccent * wisps * 0.12;
    // A faint band of light, like the edge of a galaxy.
    float band = exp(-pow(dot(d, normalize(vec3(0.35, 1.0, -0.2))) * 3.2, 2.0));
    col += uGlow * band * 0.8 * (0.6 + 0.4 * clouds);
    // Darker towards the viewer's lower sky, so content sits on calm ground.
    col *= 0.75 + 0.35 * smoothstep(-0.6, 0.5, d.y);
    gl_FragColor = vec4(col, uOpacity);
  }
`;

/* ---- Stars ---- */

const starVertex = /* glsl */ `
  attribute vec3 aSeed;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uPixelRatio;
  uniform float uTravel;
  varying float vAlpha;
  varying float vTint;
  void main() {
    vec3 p = position;
    // Stream towards the viewer as the page scrolls, wrapping in depth.
    float span = 60.0;
    p.z = mod(p.z + uTravel * (4.0 + aSeed.x * 10.0) + span * 0.5, span) - span * 0.5;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float depth = -mv.z;
    float twinkle = 0.55 + 0.45 * sin(uTime * (0.4 + aSeed.y * 2.2) + aSeed.z * 80.0);
    float nearFade = smoothstep(2.0, 7.0, depth) * (1.0 - smoothstep(24.0, 30.0, depth));
    vAlpha = uOpacity * twinkle * nearFade * (0.45 + aSeed.x * 0.9);
    vTint = aSeed.z;
    gl_PointSize = (1.1 + aSeed.x * 2.6) * uPixelRatio * (15.0 / max(depth, 1.0)) * (0.8 + twinkle * 0.3);
    gl_Position = projectionMatrix * mv;
  }
`;

const starFragment = /* glsl */ `
  varying float vAlpha;
  varying float vTint;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv) * 2.0;
    float core = exp(-r * r * 9.0);
    // The brightest few get a faint cross glint.
    float glint = (max(0.0, 1.0 - abs(uv.x) * 12.0) * max(0.0, 1.0 - abs(uv.y) * 2.4) + max(0.0, 1.0 - abs(uv.y) * 12.0) * max(0.0, 1.0 - abs(uv.x) * 2.4)) * step(0.93, vTint) * 0.5;
    vec3 col = mix(vec3(0.78, 0.85, 1.0), vec3(1.0, 0.86, 0.72), step(0.7, vTint));
    float a = (core + glint) * vAlpha;
    gl_FragColor = vec4(col * a, a);
  }
`;

/* ---- Bokeh ---- */

const bokehVertex = /* glsl */ `
  attribute vec3 aSeed;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uPixelRatio;
  uniform float uTravel;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * (0.05 + aSeed.x * 0.08) + aSeed.y * 20.0) * 1.2;
    p.y += cos(uTime * (0.04 + aSeed.y * 0.06) + aSeed.z * 20.0) * 0.8 + uTravel * (0.5 + aSeed.z);
    p.y = mod(p.y + 9.0, 18.0) - 9.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float pulse = 0.6 + 0.4 * sin(uTime * (0.2 + aSeed.x * 0.4) + aSeed.z * 30.0);
    vAlpha = uOpacity * pulse * (0.06 + aSeed.x * 0.08);
    gl_PointSize = (18.0 + aSeed.y * 46.0) * uPixelRatio * (8.0 / max(-mv.z, 1.0));
    gl_Position = projectionMatrix * mv;
  }
`;

const bokehFragment = /* glsl */ `
  uniform vec3 uAccent;
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv) * 2.0;
    if (r > 1.0) discard;
    // A soft disc with a slightly brighter rim — like out-of-focus light.
    float disc = smoothstep(1.0, 0.82, r) * (0.55 + 0.45 * smoothstep(0.5, 0.95, r));
    float a = disc * vAlpha;
    gl_FragColor = vec4(uAccent * a, a);
  }
`;

/* ---- Streaks ---- */

const streakVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const streakFragment = /* glsl */ `
  uniform float uLife;
  uniform float uOpacity;
  uniform vec3 uAccent;
  varying vec2 vUv;
  void main() {
    // A bright head travelling along the quad, with a long fading tail.
    float head = uLife;
    float along = vUv.x;
    float tail = smoothstep(head - 0.45, head, along) * step(along, head);
    float across = exp(-pow((vUv.y - 0.5) * 9.0, 2.0));
    float fade = sin(clamp(uLife, 0.0, 1.0) * 3.14159);
    float a = tail * tail * across * fade * uOpacity;
    vec3 col = mix(uAccent, vec3(1.0), 0.6);
    gl_FragColor = vec4(col * a, a);
  }
`;

export function AmbientScene({ quality }: { quality: SceneQuality }) {
  const tier = TIER[quality];
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const rigRef = useRef<Group>(null);
  const streakRefs = useRef<Group[]>([]);

  const built = useMemo(() => {
    const time = { value: 0 };
    const opacity = { value: 1 };
    const travel = { value: 0 };
    const pixelRatio = { value: 1 };
    const accent = { value: new Color(PALETTE.intro[2]) };
    const sky = new ShaderMaterial({
      vertexShader: skyVertex,
      fragmentShader: skyFragment(tier.octaves),
      uniforms: {
        uTime: time,
        uOpacity: { value: 1 },
        uScroll: { value: 0 },
        uBase: { value: new Color(PALETTE.intro[0]) },
        uGlow: { value: new Color(PALETTE.intro[1]) },
        uAccent: accent,
      },
      side: BackSide,
      depthWrite: false,
      depthTest: false,
    });
    const rand = mulberry32(2024);
    const starPos = new Float32Array(tier.stars * 3);
    const starSeed = new Float32Array(tier.stars * 3);
    for (let i = 0; i < tier.stars; i += 1) {
      // A wide slab around the camera's forward view, deep in z.
      starPos.set([(rand() - 0.5) * 60, (rand() - 0.5) * 36, (rand() - 0.5) * 60], i * 3);
      starSeed.set([Math.pow(rand(), 2.2), rand(), rand()], i * 3);
    }
    const starGeometry = new BufferGeometry();
    starGeometry.setAttribute("position", new BufferAttribute(starPos, 3));
    starGeometry.setAttribute("aSeed", new BufferAttribute(starSeed, 3));
    const stars = new ShaderMaterial({
      vertexShader: starVertex,
      fragmentShader: starFragment,
      uniforms: { uTime: time, uOpacity: opacity, uPixelRatio: pixelRatio, uTravel: travel },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const bokehPos = new Float32Array(tier.bokeh * 3);
    const bokehSeed = new Float32Array(tier.bokeh * 3);
    for (let i = 0; i < tier.bokeh; i += 1) {
      bokehPos.set([(rand() - 0.5) * 22, (rand() - 0.5) * 18, -4 - rand() * 14], i * 3);
      bokehSeed.set([rand(), rand(), rand()], i * 3);
    }
    const bokehGeometry = new BufferGeometry();
    bokehGeometry.setAttribute("position", new BufferAttribute(bokehPos, 3));
    bokehGeometry.setAttribute("aSeed", new BufferAttribute(bokehSeed, 3));
    const bokeh = new ShaderMaterial({
      vertexShader: bokehVertex,
      fragmentShader: bokehFragment,
      uniforms: { uTime: time, uOpacity: opacity, uPixelRatio: pixelRatio, uTravel: travel, uAccent: accent },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const streaks = Array.from({ length: tier.streaks }, () => ({
      material: new ShaderMaterial({
        vertexShader: streakVertex,
        fragmentShader: streakFragment,
        uniforms: { uLife: { value: 2 }, uOpacity: opacity, uAccent: accent },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
      next: 2 + rand() * 6,
      start: -10,
      duration: 1.2,
      rand,
    }));
    return {
      sky,
      skyGeometry: new SphereGeometry(35, 48, 32), // inside the camera's far plane (40)
      stars,
      starGeometry,
      bokeh,
      bokehGeometry,
      streaks,
      streakGeometry: new PlaneGeometry(1, 1),
      time,
      opacity,
      travel,
      pixelRatio,
      accent,
    };
  }, [tier.octaves, tier.stars, tier.bokeh, tier.streaks]);

  useEffect(
    () => () => {
      built.sky.dispose();
      built.skyGeometry.dispose();
      built.stars.dispose();
      built.starGeometry.dispose();
      built.bokeh.dispose();
      built.bokehGeometry.dispose();
      built.streaks.forEach((s) => s.material.dispose());
      built.streakGeometry.dispose();
    },
    [built]
  );

  const mixed = useMemo(() => ({ base: new Color(), glow: new Color(), accent: new Color(), c: new Color() }), []);

  useFrame((state, delta) => {
    const rig = rigRef.current;
    if (!rig) return;
    const time = state.clock.elapsedTime;
    rig.position.copy(camera.position);

    // Chapter palette, crossfaded exactly like the chapters themselves.
    mixed.base.setRGB(0, 0, 0);
    mixed.glow.setRGB(0, 0, 0);
    mixed.accent.setRGB(0, 0, 0);
    let total = 0;
    STAGE_IDS.forEach((id) => {
      const w = journeyState.weight[id] ?? 0;
      if (w <= 0) return;
      total += w;
      const [base, glow, accent] = PALETTE[id];
      mixed.base.add(mixed.c.set(base).multiplyScalar(w));
      mixed.glow.add(mixed.c.set(glow).multiplyScalar(w));
      mixed.accent.add(mixed.c.set(accent).multiplyScalar(w));
    });
    if (total > 0) {
      mixed.base.multiplyScalar(1 / total);
      mixed.glow.multiplyScalar(1 / total);
      mixed.accent.multiplyScalar(1 / total);
    } else {
      mixed.base.set(PALETTE.intro[0]);
      mixed.glow.set(PALETTE.intro[1]);
      mixed.accent.set(PALETTE.intro[2]);
    }
    const su = built.sky.uniforms as Record<string, IUniform>;
    (su.uBase!.value as Color).lerp(mixed.base, 1 - Math.exp(-delta * 3));
    (su.uGlow!.value as Color).lerp(mixed.glow, 1 - Math.exp(-delta * 3));
    built.accent.value.lerp(mixed.accent, 1 - Math.exp(-delta * 3));
    su.uScroll!.value = journeyState.globalProgress;
    su.uOpacity!.value = 1;

    // The Vision chapter brings its own underwater world: no stars there.
    const underwater = journeyState.weight.future ?? 0;
    built.opacity.value = 1 - underwater;
    built.time.value = time;
    built.travel.value = journeyState.globalProgress * 6;
    built.pixelRatio.value = gl.getPixelRatio();

    // Now and then, a streak of light arcs across the sky.
    built.streaks.forEach((streak, i) => {
      const group = streakRefs.current[i];
      if (!group) return;
      const life = (time - streak.start) / streak.duration;
      if (life > 1.2 && time > streak.next) {
        streak.start = time;
        streak.duration = 0.9 + streak.rand() * 0.8;
        streak.next = time + 4 + streak.rand() * 7;
        const angle = -0.25 - streak.rand() * 0.5;
        group.position.set((streak.rand() - 0.5) * 16, 3 + streak.rand() * 5, -16 - streak.rand() * 6);
        group.rotation.set(0, 0, angle + (streak.rand() < 0.5 ? Math.PI : 0));
        group.scale.set(4 + streak.rand() * 5, 0.09, 1);
      }
      (streak.material.uniforms.uLife as IUniform<number>).value = life;
      group.visible = life >= 0 && life <= 1;
    });
  });

  return (
    <group ref={rigRef}>
      <mesh geometry={built.skyGeometry} material={built.sky} renderOrder={-100} frustumCulled={false} />
      <points geometry={built.starGeometry} material={built.stars} renderOrder={-90} frustumCulled={false} />
      <points geometry={built.bokehGeometry} material={built.bokeh} renderOrder={-85} frustumCulled={false} />
      {built.streaks.map((streak, i) => (
        <group
          key={i}
          ref={(g) => {
            if (g) streakRefs.current[i] = g;
          }}
          visible={false}
        >
          <mesh geometry={built.streakGeometry} material={streak.material} renderOrder={-88} />
        </group>
      ))}
    </group>
  );
}
