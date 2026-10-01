"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PlaneGeometry, ShaderMaterial, type BufferAttribute, type IUniform, type Vector3 } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { damp } from "@/lib/motion/mathUtils";
import { tieredParticleCount, type SceneQuality } from "@/lib/three/deviceTiers";

/**
 * The world behind the Hero's living D3-SG mark (three/scenes/IntroScene.tsx):
 * a photographic deep-space plate, drawn in one full-frame shader so every
 * layer occludes the next correctly —
 *
 * - a galactic band crossing behind the mark: domain-warped emission clouds
 *   (ember and dusty rose, a trace of teal) cut by dark absorption lanes;
 * - a real starfield: three layers of procedural stars with blackbody tints
 *   (blue-white → white → gold → orange) and a power-law brightness spread,
 *   denser inside the band, plus a few bright stars with diffraction spikes;
 * - a planet's limb rising in the lower right: a lit crescent with slowly
 *   turning cloud bands, faint city lights on the night side, a warm
 *   terminator and a thin Rayleigh-blue atmosphere glowing along the limb —
 *   with the sun just breaking over its edge (soft glare and a fine
 *   anamorphic streak);
 * - near-field dust (the v1 starfield, thinned) drifting in front for depth.
 *
 * Everything moves very slowly — cloud drift, planet rotation, star twinkle,
 * the sun's breathing glare — with a little pointer parallax per layer. The
 * copy side (left) is kept darker for readability. Fades with the Hero's
 * crossfade weight; the quality tier sets the cloud detail.
 */

const OCTAVES: Record<SceneQuality, number> = { high: 6, medium: 5, low: 4 };

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec2 uAspect;
  uniform vec2 uParallax;
  uniform vec2 uPlanet;
  uniform float uPlanetRadius;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec2 hash2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < OCTAVES; i++) { v += a * noise(p); p = r * p * 2.03 + 11.7; a *= 0.5; }
    return v;
  }

  // Blackbody-ish star tint from a 0..1 temperature seed.
  vec3 starTint(float t) {
    vec3 hot = vec3(0.72, 0.82, 1.0);
    vec3 white = vec3(1.0, 0.98, 0.95);
    vec3 gold = vec3(1.0, 0.86, 0.62);
    vec3 cool = vec3(1.0, 0.68, 0.45);
    return t < 0.3 ? mix(hot, white, t / 0.3) : t < 0.8 ? mix(white, gold, (t - 0.3) / 0.5) : mix(gold, cool, (t - 0.8) / 0.2);
  }

  // One layer of procedural stars: at most one per cell.
  vec3 starLayer(vec2 p, float scale, float density, float size, float twinkle) {
    vec2 g = p * scale;
    vec2 cell = floor(g);
    vec2 f = fract(g);
    float h = hash(cell);
    if (h > density) return vec3(0.0);
    vec2 o = 0.2 + 0.6 * hash2(cell + 7.3);
    float d = length(f - o);
    float seed = hash(cell + 3.1);
    // Power law: many faint stars, a few bright ones.
    float mag = pow(seed, 6.0) * 2.2 + 0.18;
    float tw = 1.0 - twinkle + twinkle * (0.6 + 0.4 * sin(uTime * (1.2 + seed * 3.0) + h * 80.0));
    float core = exp(-d * d / (size * size * (0.4 + mag)));
    return starTint(hash(cell + 9.7)) * core * mag * tw;
  }

  // A bright star with diffraction spikes.
  vec3 spikeStar(vec2 p, vec2 c, float b, vec3 tint) {
    vec2 d = p - c;
    float r = length(d);
    float glow = exp(-r * 900.0) * 1.6 + exp(-r * 140.0) * 0.18;
    float spikes = (exp(-abs(d.y) * 2600.0) + exp(-abs(d.x) * 2600.0)) * exp(-r * 38.0) * 0.55;
    return tint * (glow + spikes) * b;
  }

  void main() {
    vec2 p = (vUv - 0.5) * uAspect;
    float t = uTime;

    // ---- Deep space ----
    vec3 col = vec3(0.004, 0.006, 0.013);

    // The galactic band: a soft diagonal behind the mark.
    vec2 bp = p + uParallax * 0.4;
    float bandDist = dot(bp - vec2(0.12, 0.02), normalize(vec2(0.42, 1.0)));
    float band = exp(-bandDist * bandDist * 26.0);

    // Emission clouds, domain-warped and drifting almost imperceptibly.
    vec2 q = bp * 5.0 + vec2(t * 0.004, -t * 0.003);
    vec2 w = vec2(fbm(q + vec2(1.7, 9.2)), fbm(q + vec2(8.3, 2.8)));
    float clouds = fbm(q + 2.4 * w);
    float fine = fbm(q * 3.1 - w * 1.3);
    vec3 ember = vec3(0.36, 0.1, 0.055);
    vec3 rose = vec3(0.26, 0.09, 0.12);
    vec3 teal = vec3(0.03, 0.11, 0.14);
    vec3 neb = mix(rose, ember, smoothstep(0.35, 0.75, w.x));
    neb = mix(neb, teal, smoothstep(0.55, 0.85, w.y) * 0.6);
    float emission = smoothstep(0.38, 0.95, clouds) * (0.55 + 0.45 * fine);
    // Dark absorption lanes threading through the band.
    float lanes = smoothstep(0.52, 0.72, fbm(q * 1.7 + 4.0 - w * 0.8));
    float extinction = 1.0 - lanes * 0.85 * band;
    col += neb * emission * band * 0.9 * extinction;
    // Unresolved star-glow along the band's core.
    col += vec3(0.07, 0.055, 0.06) * band * band * (0.6 + 0.4 * fine) * extinction;

    // ---- Stars ----
    vec2 sp = p + uParallax * 0.15;
    float starDensity = 0.35 + band * 0.65;
    vec3 stars = vec3(0.0);
    stars += starLayer(sp, 130.0, 0.1 * starDensity, 0.07, 0.25);
    stars += starLayer(sp + 3.7, 260.0, 0.18 * starDensity, 0.09, 0.4);
    stars += starLayer(sp + 9.1, 480.0, 0.24 * starDensity, 0.11, 0.0) * 0.5;
    stars *= extinction;
    stars += spikeStar(sp, vec2(0.31, 0.19), 1.0, vec3(0.8, 0.88, 1.0));
    stars += spikeStar(sp, vec2(-0.05, 0.23), 0.55, vec3(1.0, 0.9, 0.75));
    stars += spikeStar(sp, vec2(0.41, -0.02), 0.45, vec3(1.0, 0.8, 0.62));
    stars += spikeStar(sp, vec2(-0.36, -0.12), 0.35, vec3(0.85, 0.9, 1.0));
    stars += spikeStar(sp, vec2(0.08, 0.1), 0.3, vec3(1.0, 0.95, 0.9));

    // ---- Planet ----
    vec2 pp = p + uParallax;
    vec2 rel = (pp - uPlanet) / uPlanetRadius;
    float r = length(rel);
    // Sun above and just behind the planet: a thin lit crescent along the top.
    vec3 sunDir = normalize(vec3(-0.12, 0.75, -0.5));
    vec3 atmoBlue = vec3(0.32, 0.58, 1.0);
    vec3 atmoWarm = vec3(1.0, 0.55, 0.3);
    float edge = 0.0025 / uPlanetRadius;
    float inside = 1.0 - smoothstep(1.0 - edge, 1.0, r);

    // Sun direction projected on the disc — where the limb is lit.
    vec2 sunSide = normalize(sunDir.xy);
    float limbLit = smoothstep(-0.2, 0.85, dot(normalize(rel + 1e-5), sunSide));

    vec3 planet = vec3(0.0);
    if (r < 1.0) {
      vec3 n = vec3(rel, sqrt(max(0.0, 1.0 - r * r)));
      float ndl = dot(n, sunDir);
      float day = smoothstep(-0.08, 0.35, ndl);
      // Surface: slowly rotating cloud bands over deep ocean.
      vec2 sph = vec2(atan(n.x, n.z) * 1.4 + t * 0.006, asin(clamp(n.y, -1.0, 1.0)) * 2.4);
      float cloudCover = smoothstep(0.45, 0.85, fbm(sph * 3.2 + vec2(0.0, fbm(sph * 1.5) * 1.2)));
      vec3 ocean = vec3(0.012, 0.04, 0.08);
      vec3 land = vec3(0.06, 0.07, 0.06);
      float landMask = smoothstep(0.52, 0.6, fbm(sph * 1.8 + 5.0));
      vec3 surf = mix(ocean, land, landMask);
      surf = mix(surf, vec3(0.62, 0.66, 0.72), cloudCover * 0.75);
      // Warm, sunset-tinted terminator.
      float term = exp(-pow((ndl - 0.02) * 9.0, 2.0));
      planet = surf * day * 0.7 + atmoWarm * term * 0.12 * (1.0 - cloudCover * 0.4);
      // Night side: sparse city lights under the clouds.
      vec2 cg = sph * 70.0;
      float city = step(0.965, hash(floor(cg))) * exp(-length(fract(cg) - 0.5) * 7.0);
      planet += vec3(1.0, 0.7, 0.4) * city * landMask * (1.0 - day) * (1.0 - cloudCover) * 0.5;
      // Atmosphere seen through the edge of the disc.
      float fres = pow(1.0 - n.z, 3.0);
      planet += mix(atmoBlue, atmoWarm, 0.25) * fres * (0.25 + 0.9 * limbLit) * 0.6;
    }

    // Stars and nebula are hidden behind the planet.
    col = mix(col + stars, planet, inside);

    // Atmospheric halo outside the limb: thin and blue, warmer toward the sun.
    float outer = max(r - 1.0, 0.0) * uPlanetRadius;
    float halo = exp(-outer * 70.0) * 0.55 + exp(-outer * 14.0) * 0.12;
    col += mix(atmoBlue, atmoWarm, limbLit * 0.35) * halo * (0.12 + limbLit) * (1.0 - inside * 0.6);

    // The sun, just breaking over the limb.
    vec2 sunPos = uPlanet + sunSide * uPlanetRadius * 1.004;
    vec2 ds = pp - sunPos;
    float breathe = 0.9 + 0.1 * sin(t * 0.3);
    float sun = exp(-length(ds) * 60.0) * 1.1 + exp(-length(ds) * 9.0) * 0.16;
    float streak = exp(-abs(ds.y) * 420.0) * exp(-abs(ds.x) * 3.2) * 0.35;
    col += vec3(1.0, 0.82, 0.62) * (sun + streak) * breathe * (1.0 - inside * 0.85);

    // Keep the copy side calmer, vignette, and a trace of film grain.
    col *= mix(0.62, 1.0, smoothstep(0.02, 0.62, vUv.x));
    vec2 v = vUv - 0.5;
    col *= 1.0 - dot(v, v) * 0.9;
    col += (hash(vUv * 1200.0 + fract(t * 11.0)) - 0.5) * 0.006;

    gl_FragColor = vec4(col, uOpacity);
  }
`;

export function HeroAtmosphere({ quality, anchor }: { quality: SceneQuality; anchor: Vector3 }) {
  const size = useThree((state) => state.size);
  const dustHandle = useRef<ParticleSystemHandle>(null);
  const initialized = useRef(false);
  const dustCount = tieredParticleCount(700, quality);
  const portrait = size.width / Math.max(size.height, 1) < 1.05;

  const plate = useMemo(() => {
    const material = new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      defines: { OCTAVES: OCTAVES[quality] },
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uAspect: { value: [62 / 36, 1] },
        uParallax: { value: [0, 0] },
        uPlanet: { value: [0.35, -1.0] },
        uPlanetRadius: { value: 0.82 },
      },
      depthWrite: false,
      transparent: true,
    });
    return { material, plane: new PlaneGeometry(1, 1) };
  }, [quality]);

  useEffect(
    () => () => {
      plate.material.dispose();
      plate.plane.dispose();
    },
    [plate]
  );

  useFrame((state, delta) => {
    const weight = journeyState.weight.intro;
    const u = plate.material.uniforms as Record<string, IUniform>;
    u.uOpacity!.value = Math.min(1, weight * 1.1);
    if (weight <= 0.001) return;
    u.uTime!.value = state.clock.elapsedTime;

    const parallax = u.uParallax!.value as number[];
    parallax[0] = damp(parallax[0] ?? 0, -journeyState.pointer.x * 0.006, 2, delta);
    parallax[1] = damp(parallax[1] ?? 0, journeyState.pointer.y * 0.004, 2, delta);
    // Landscape: the planet rises under the mark, lower right. Portrait:
    // centred low, below where the copy starts.
    const planet = u.uPlanet!.value as number[];
    planet[0] = portrait ? 0 : 0.28 + anchor.x * 0.025;
    planet[1] = portrait ? -1.2 : -1.0;

    if (!initialized.current) {
      const positions = dustHandle.current?.positions;
      if (positions) {
        for (let i = 0; i < positions.length / 3; i += 1) {
          positions[i * 3] = (Math.random() - 0.5) * 16;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 9;
          positions[i * 3 + 2] = -4 + Math.random() * 8;
        }
        const attribute = dustHandle.current?.points?.geometry.attributes.position as BufferAttribute | undefined;
        if (attribute) attribute.needsUpdate = true;
        initialized.current = true;
      }
    }
    const dust = dustHandle.current;
    if (dust?.material) dust.material.opacity = damp(dust.material.opacity, 0.28 * weight, 4, delta);
    if (dust?.points) dust.points.rotation.y += delta * 0.01;
  });

  return (
    <group>
      <mesh geometry={plate.plane} material={plate.material} position={[0, 0.4, -16]} scale={[62, 36, 1]} renderOrder={-20} />
      <ParticleSystem ref={dustHandle} count={dustCount} size={0.03} color="#e8e4dc" opacity={0} additive sizeAttenuation />
    </group>
  );
}
