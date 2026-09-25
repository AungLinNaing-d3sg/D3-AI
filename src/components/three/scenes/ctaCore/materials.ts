import {
  BackSide,
  BoxGeometry,
  Color,
  CustomBlending,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SrcAlphaFactor,
  Vector2,
  Vector3,
  Vector4,
  ZeroFactor,
  type Material,
} from "three";
import type { ThemeColors } from "@/lib/three/themeColors";

/**
 * Materials and shaders for Chapter 08's intelligence core
 * (three/scenes/CtaScene.tsx). Every surface type responds differently —
 * glass (transmission, clear coat), metal (anisotropic-looking env
 * reflections, smudged roughness), energy/data paths (additive light),
 * particles (soft points), the distant structures (lit by the core's own
 * light falloff) and the environment — and all of them share one
 * content-safe mask so the HTML always stays the primary layer.
 */

/* ------------------------------------------------------------------ */
/* Shared GLSL                                                          */
/* ------------------------------------------------------------------ */

/** Content-safe mask and section edges, in drawing-buffer pixels. Usable in
 * both vertex and fragment stages. */
export const SHIELD_GLSL = /* glsl */ `
uniform vec4 uShieldRect;
uniform float uShieldFeather;
uniform float uShield;
uniform vec3 uShade;
uniform vec2 uEdges;
uniform float uEdgeFeather;
uniform vec2 uResolution;
float ctaEdges(vec2 frag) {
  return smoothstep(uEdges.x, uEdges.x - uEdgeFeather, frag.y) * smoothstep(uEdges.y, uEdges.y + uEdgeFeather, frag.y);
}
float ctaShield(vec2 frag) {
  vec2 d = abs(frag - uShieldRect.xy) - uShieldRect.zw;
  float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  return (1.0 - smoothstep(-uShieldFeather * 0.35, uShieldFeather, dist)) * uShield;
}
`;

export const NOISE_GLSL = /* glsl */ `
float ctaHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float ctaNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(ctaHash(i), ctaHash(i + vec2(1.0, 0.0)), u.x), mix(ctaHash(i + vec2(0.0, 1.0)), ctaHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float ctaFbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * ctaNoise(p);
    p *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}
`;

export interface ShieldUniforms {
  /** Content box: centre xy, half-size zw (drawing-buffer pixels). */
  uShieldRect: { value: Vector4 };
  uShieldFeather: { value: number };
  /** 0..1 strength of the content-safe treatment. */
  uShield: { value: number };
  /** What the scene recedes into behind the content. */
  uShade: { value: Color };
  /** The section's top/bottom edge (drawing-buffer y) and fade distance:
   * the environment and every loose particle fade out there, so nothing of
   * the studio leaks into the chapter above while the section scrolls in. */
  uEdges: { value: Vector2 };
  uEdgeFeather: { value: number };
  uResolution: { value: Vector2 };
}

export function createShieldUniforms(theme: ThemeColors): ShieldUniforms {
  return {
    uShieldRect: { value: new Vector4(-1e4, -1e4, 1, 1) },
    uShieldFeather: { value: 200 },
    uShield: { value: 0 },
    uShade: { value: theme.base.clone().lerp(theme.ink900, 0.4) },
    uEdges: { value: new Vector2(1e5, -1e5) },
    uEdgeFeather: { value: 200 },
    uResolution: { value: new Vector2(1, 1) },
  };
}

/* ------------------------------------------------------------------ */
/* Colour                                                               */
/* ------------------------------------------------------------------ */

/** Burnt orange: the brand tokens sit on the red side of orange and filmic
 * tone mapping pushes lit red-orange further toward red, so the light
 * colour is nudged a few degrees toward amber to still read as the site's
 * orange. */
export function orangeOf(color: Color, desaturate = 0): Color {
  return color.clone().offsetHSL(0.03, -desaturate, 0);
}

/** Deep graphite with a trace of midnight blue — the studio's foundation. */
export function graphiteOf(theme: ThemeColors): Color {
  return theme.base.clone().lerp(theme.ink800, 0.55);
}

/* ------------------------------------------------------------------ */
/* Built-in materials                                                   */
/* ------------------------------------------------------------------ */

/**
 * Patches a built-in material with:
 * - the content-safe treatment: wherever it passes behind the HTML content
 *   it is darkened toward the environment, desaturated, its contrast (and
 *   so its reflections and glow) compressed — like falling out of focus —
 *   rather than hidden behind an opaque panel;
 * - optionally (`surface`), physical imperfections: low-frequency smudges
 *   in the roughness, so highlights and refraction break up like a real
 *   finished surface instead of a perfect CG mirror.
 * The uniform objects are shared, so one write per frame updates every
 * patched material.
 */
export function withShield<T extends Material>(
  material: T,
  shield: ShieldUniforms,
  key: string,
  surface = false,
): T {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shield);
    if (surface) {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vCtaObj;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvCtaObj = position;",
        );
    }
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\n${SHIELD_GLSL}\n${surface ? `varying vec3 vCtaObj;\n${NOISE_GLSL}` : ""}`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        surface
          ? `#include <roughnessmap_fragment>
float ctaSmudge = ctaFbm(vCtaObj.xy * 3.1 + vCtaObj.z * 1.9) - 0.5;
float ctaGrain = ctaHash(floor(vCtaObj.xy * 240.0 + vCtaObj.z * 90.0)) - 0.5;
roughnessFactor = clamp(roughnessFactor + ctaSmudge * 0.12 + ctaGrain * 0.02, 0.04, 1.0);`
          : "#include <roughnessmap_fragment>",
      )
      .replace(
        "#include <opaque_fragment>",
        `#include <opaque_fragment>
{
  float shield = ctaShield(gl_FragCoord.xy);
  float luma = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 muted = mix(vec3(luma), gl_FragColor.rgb, 0.45) * 0.3;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(uShade, muted, 0.65), shield);
  gl_FragColor.a *= 1.0 - shield * 0.45;
}`,
      );
  };
  material.customProgramCacheKey = () => `cta-core-${key}`;
  return material;
}

/**
 * The studio the glass and metal reflect, built from the theme tokens: a
 * broad overhead softbox, a warm key softbox front-left, a restrained cyan
 * strip right, a violet card far behind, a burnt-orange floor bounce and a
 * dim front fill, in a graphite room. Rendered once into a prefiltered env
 * map for this scene only.
 */
export function buildStudio(theme: ThemeColors): Scene {
  const scene = new Scene();
  const room = new Mesh(
    new BoxGeometry(1, 1, 1),
    new MeshBasicMaterial({ color: graphiteOf(theme), side: BackSide }),
  );
  room.scale.setScalar(24);
  scene.add(room);
  const card = (
    color: Color,
    intensity: number,
    position: [number, number, number],
    size: [number, number],
  ) => {
    const mesh = new Mesh(
      new PlaneGeometry(1, 1),
      new MeshBasicMaterial({
        color: color.clone().multiplyScalar(intensity),
        side: DoubleSide,
      }),
    );
    mesh.position.set(...position);
    mesh.lookAt(0, 0, 0);
    mesh.scale.set(size[0], size[1], 1);
    scene.add(mesh);
  };
  // Overhead softbox set back, so the upper chamfers reflect the dark room
  // (not a flat white flare) and it rakes the shoulders instead.
  card(theme.ink50, 0.35, [0, 7, -3], [9, 3.4]);
  card(
    theme.ink50.clone().lerp(orangeOf(theme.brand300), 0.25),
    2.2,
    [-6, 2.5, 5],
    [2.2, 6],
  );
  card(theme.cyan400, 0.6, [6.5, 1, 2], [0.9, 7]);
  card(
    theme.cyan400.clone().lerp(theme.ink200, 0.5),
    0.35,
    [4, -1, -6],
    [1.2, 4],
  );
  card(theme.violet400, 0.25, [-3, 2, -8], [4, 5]);
  card(orangeOf(theme.brand600), 0.6, [0, -6, 2], [10, 2]);
  card(theme.ink200, 0.35, [0, 1, 10], [10, 3]);
  return scene;
}

/* ------------------------------------------------------------------ */
/* Shaders                                                              */
/* ------------------------------------------------------------------ */

/** Pure additive light: adds colour and leaves the target's alpha alone.
 * (Three's `AdditiveBlending` also accumulates alpha, which would stamp each
 * point's whole quad opaque into a transparent canvas — the reduced-motion
 * still canvas is one.) */
function additive(material: ShaderMaterial): ShaderMaterial {
  material.blending = CustomBlending;
  material.blendSrc = OneFactor;
  material.blendDst = OneFactor;
  material.blendSrcAlpha = ZeroFactor;
  material.blendDstAlpha = OneFactor;
  return material;
}

/**
 * Soft additive light points — data points, streams, node halos, dust and
 * distant motes. Size is in world units (`uSize` converts to drawing-buffer
 * pixels at the point's depth); colour carries brightness. Behind the
 * content each point is thinned out (a stable subset is dropped), defocused
 * (grown, with its energy spread so it gets dimmer, not bigger-and-bright)
 * and dimmed, so the copy always wins.
 */
export function createGlowPoints(
  shield: ShieldUniforms,
  falloff: number,
): ShaderMaterial {
  return additive(
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        ...shield,
        uSize: { value: 1 },
        uFalloff: { value: falloff },
      },
      vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aSize;
      uniform float uSize;
      varying vec3 vColor;
      ${SHIELD_GLSL}
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        vec2 frag = (gl_Position.xy / max(gl_Position.w, 1e-4) * 0.5 + 0.5) * uResolution;
        float shield = ctaShield(frag);
        float keep = step(shield * 0.6, fract(aSize * 7919.37));
        float blur = 1.0 + shield * 1.4;
        gl_PointSize = clamp(aSize * uSize * blur / max(-mv.z, 0.05), 1.0, 256.0);
        vColor = aColor * keep * (1.0 - shield * 0.7) / (blur * blur) * ctaEdges(frag);
      }
    `,
      fragmentShader: /* glsl */ `
      uniform float uFalloff;
      varying vec3 vColor;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = dot(c, c) * 4.0;
        float a = exp(-d * uFalloff) * (1.0 - smoothstep(0.6, 1.0, d));
        gl_FragColor = vec4(vColor * a, 1.0);
        #include <colorspace_fragment>
      }
    `,
    }),
  );
}

/**
 * The data paths, all in one draw call. Each path fills from its start to
 * its end once the story passes its turn (`aOrder`), so the connections
 * illuminate one after another; unlit, a path is only a faint etched line.
 * Lit paths carry slow pulses of light toward their ends.
 */
export function createPathMaterial(
  theme: ThemeColors,
  shield: ShieldUniforms,
): ShaderMaterial {
  return additive(
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        ...shield,
        uConnect: { value: 0 },
        uEnergy: { value: 0 },
        uWake: { value: 0 },
        uTime: { value: 0 },
        uIdle: { value: theme.ink300.clone() },
        uWarm: { value: orangeOf(theme.brand400) },
        uHot: { value: orangeOf(theme.brand300).lerp(theme.ink50, 0.35) },
      },
      vertexShader: /* glsl */ `
      attribute float aOrder;
      varying float vT;
      varying float vOrder;
      void main() {
        vT = uv.x;
        vOrder = aOrder;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
      fragmentShader: /* glsl */ `
      uniform float uConnect;
      uniform float uEnergy;
      uniform float uWake;
      uniform float uTime;
      uniform vec3 uIdle;
      uniform vec3 uWarm;
      uniform vec3 uHot;
      varying float vT;
      varying float vOrder;
      ${SHIELD_GLSL}
      void main() {
        float fill = clamp((uConnect - vOrder * 0.72) / 0.28, 0.0, 1.0);
        float lit = smoothstep(vT - 0.08, vT, fill);
        float head = exp(-pow((vT - fill) * 14.0, 2.0)) * step(0.001, fill) * (1.0 - step(0.999, fill));
        float pulse = pow(0.5 + 0.5 * sin((vT * 3.0 - uTime * 0.22 + vOrder * 7.0) * 6.2832), 14.0);
        vec3 col = uIdle * 0.035 * (0.4 + 0.6 * uWake);
        col += uWarm * lit * (0.28 + 0.32 * uEnergy);
        col += uHot * (head * 0.9 + pulse * lit * (0.25 + 0.55 * uEnergy));
        gl_FragColor = vec4(col * (1.0 - ctaShield(gl_FragCoord.xy) * 0.85), 1.0);
        #include <colorspace_fragment>
      }
    `,
    }),
  );
}

/**
 * The distant supporting structures — frames, technical arcs, link lines
 * and thin glass panels. They are lit by the core itself: cool and dark
 * far from it, picking up burnt orange as the core's light reaches them
 * (falling off with world distance, growing with the core's energy), and
 * fading with depth like fog. `panel` builds the glass variant: a fine
 * bright edge, an almost invisible body and a soft moving sheen.
 */
export function createStructureMaterial(
  theme: ThemeColors,
  shield: ShieldUniforms,
  panel: boolean,
): ShaderMaterial {
  return additive(
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      defines: panel ? { CTA_PANEL: "" } : {},
      uniforms: {
        ...shield,
        uCore: { value: new Vector3() },
        uReach: { value: 2 },
        uEnergy: { value: 0 },
        uWake: { value: 0 },
        uOpacity: { value: 1 },
        uFog: { value: new Vector2(4, 12) },
        uSheen: { value: 0 },
        uCool: { value: theme.cyan300.clone().lerp(theme.ink300, 0.55) },
        uWarm: { value: orangeOf(theme.brand400) },
      },
      vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying float vDepth;
      varying vec2 vPanelUv;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vec4 mv = viewMatrix * world;
        vDepth = -mv.z;
        vPanelUv = uv;
        gl_Position = projectionMatrix * mv;
      }
    `,
      fragmentShader: /* glsl */ `
      uniform vec3 uCore;
      uniform float uReach;
      uniform float uEnergy;
      uniform float uWake;
      uniform float uOpacity;
      uniform vec2 uFog;
      uniform float uSheen;
      uniform vec3 uCool;
      uniform vec3 uWarm;
      varying vec3 vWorld;
      varying float vDepth;
      varying vec2 vPanelUv;
      ${SHIELD_GLSL}
      void main() {
        float d = distance(vWorld, uCore) / uReach;
        float warmth = exp(-d * d) * (0.12 + 0.88 * uEnergy);
        float fog = 1.0 - smoothstep(uFog.x, uFog.y, vDepth);
        vec3 col = uCool * (0.3 + 0.7 * uWake) * (1.0 - 0.6 * warmth) + uWarm * warmth * 1.6;
        float a = 1.0;
        #ifdef CTA_PANEL
          vec2 e = min(vPanelUv, 1.0 - vPanelUv);
          float edge = max(1.0 - smoothstep(0.0, 0.012, e.x), 1.0 - smoothstep(0.0, 0.006, e.y));
          float sheen = exp(-pow((vPanelUv.x * 0.7 + vPanelUv.y * 0.3 - uSheen) * 5.0, 2.0));
          a = edge * 0.8 + 0.05 + sheen * 0.14;
        #endif
        float shield = ctaShield(gl_FragCoord.xy);
        gl_FragColor = vec4(col * a * fog * uOpacity * (1.0 - shield * 0.88) * ctaEdges(gl_FragCoord.xy), 1.0);
        #include <colorspace_fragment>
      }
    `,
    }),
  );
}

/** Screen-space blending in the opaque list (see `createEnvironment`). */
function blendedOpaque(material: ShaderMaterial): ShaderMaterial {
  material.transparent = false;
  material.blending = CustomBlending;
  material.blendSrc = SrcAlphaFactor;
  material.blendDst = OneMinusSrcAlphaFactor;
  material.depthWrite = false;
  return material;
}

/**
 * The studio environment, computed in screen space from the theme tokens,
 * in depth layers: a deep graphite/midnight foundation with a trace of warm
 * charcoal low down; restrained cyan light falling from the far upper left
 * and a cooler bounce far right; violet depth in the far corners; slowly
 * drifting volumetric haze and depth fog; warm, anisotropic burnt-orange
 * light around the core that the haze scatters (never a disc) with very
 * faint rays; a soft key-light shaft; a floor horizon; and a vignette.
 * Behind the content it flattens toward the foundation. It fades out at the
 * section's edges into the page. Dithered.
 *
 * Blended but kept in the opaque render list, so the shell's transmission
 * pass refracts it instead of an empty background.
 */
export function createEnvironment(
  theme: ThemeColors,
  shield: ShieldUniforms,
): ShaderMaterial {
  const material = new ShaderMaterial({
    depthTest: false,
    toneMapped: false,
    uniforms: {
      ...shield,
      uTime: { value: 0 },
      uFocus: { value: new Vector2(0.7, 0.5) },
      uFocusSize: { value: new Vector2(0.2, 0.3) },
      uWake: { value: 0 },
      uEnergy: { value: 0 },
      uIntensity: { value: 1 },
      uBase: { value: theme.base.clone().lerp(theme.ink900, 0.4) },
      uGraphite: { value: graphiteOf(theme) },
      uCharcoal: {
        value: graphiteOf(theme).lerp(orangeOf(theme.brand800, 0.4), 0.08),
      },
      uWarm: { value: orangeOf(theme.brand600, 0.1) },
      uAmber: { value: orangeOf(theme.brand400) },
      uCyan: { value: theme.cyan400.clone().lerp(theme.ink300, 0.4) },
      uViolet: { value: theme.violet400.clone() },
      uKey: {
        value: theme.ink200.clone().lerp(orangeOf(theme.brand300), 0.15),
      },
    },
    vertexShader: /* glsl */ `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec2 uFocus;
      uniform vec2 uFocusSize;
      uniform float uWake;
      uniform float uEnergy;
      uniform float uIntensity;
      uniform vec3 uBase;
      uniform vec3 uGraphite;
      uniform vec3 uCharcoal;
      uniform vec3 uWarm;
      uniform vec3 uAmber;
      uniform vec3 uCyan;
      uniform vec3 uViolet;
      uniform vec3 uKey;
      ${NOISE_GLSL}
      ${SHIELD_GLSL}

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution;
        float aspect = uResolution.x / uResolution.y;
        vec2 q = vec2(uv.x * aspect, uv.y);
        float shield = ctaShield(gl_FragCoord.xy);
        float presence = (0.3 + 0.7 * uWake) * uIntensity;
        float glow = 0.35 + 0.65 * uEnergy;

        vec3 col = mix(uCharcoal, uGraphite, smoothstep(-0.1, 0.55, uv.y));
        col = mix(col, uBase, smoothstep(0.55, 1.15, uv.y));

        vec2 cp = vec2((uv.x - 0.02) * aspect, uv.y - 1.02);
        col += uCyan * exp(-dot(cp, cp) / 0.5) * 0.036 * presence;
        vec2 cr = vec2((uv.x - 1.02) * aspect, uv.y - 0.62);
        col += uCyan * exp(-dot(cr, cr) / 0.18) * 0.014 * presence;
        vec2 vp = vec2((uv.x - 0.98) * aspect, uv.y + 0.02);
        vec2 vq = vec2((uv.x - 0.05) * aspect, uv.y - 0.05);
        col += uViolet * (exp(-dot(vp, vp) / 0.45) * 0.016 + exp(-dot(vq, vq) / 0.3) * 0.009);

        float haze = ctaFbm(q * 1.15 + vec2(uTime * 0.006, -uTime * 0.003));
        float hazeFine = ctaFbm(q * 3.4 + vec2(-uTime * 0.005, uTime * 0.004) + 3.7);
        float hz = smoothstep(0.3, 0.92, haze * 0.7 + hazeFine * 0.3);
        hz = mix(hz, 0.3, shield);

        vec2 f = vec2((uv.x - uFocus.x) * aspect, uv.y - uFocus.y);
        vec2 e = f / max(vec2(uFocusSize.x * aspect, uFocusSize.y), vec2(0.02));
        float atmosphere = exp(-dot(e * vec2(0.62, 0.62), e * vec2(0.62, 0.62)));
        float inner = exp(-dot(e * vec2(0.95, 0.8), e * vec2(0.95, 0.8)));
        col += uWarm * atmosphere * (0.35 + 0.65 * hz) * 0.058 * presence * glow;
        col += uAmber * inner * (0.6 + 0.4 * hz) * 0.03 * presence * glow;
        col += mix(uCyan * 0.3, uWarm * 0.7, atmosphere) * hz * 0.024 * presence;

        float rays = smoothstep(0.55, 0.95, ctaFbm(vec2(atan(f.y, f.x) * 7.0, uTime * 0.015)));
        col += uAmber * rays * atmosphere * (1.0 - inner) * 0.018 * presence * uEnergy;

        vec2 k = vec2((uv.x - uFocus.x + 0.35) * aspect, uv.y - 1.25);
        float shaft = exp(-dot(k, k) / 0.9) * smoothstep(0.35, 0.85, ctaFbm(vec2(atan(k.x, -k.y) * 5.0, uTime * 0.01)));
        col += uKey * shaft * 0.018 * presence;

        float horizonY = uFocus.y - uFocusSize.y * 0.98;
        float horizon = exp(-pow((uv.y - horizonY) * 16.0, 2.0)) * exp(-pow(f.x / (uFocusSize.x * aspect * 3.0), 2.0));
        col += mix(uKey * 0.25, uAmber, 0.6) * horizon * 0.03 * presence * glow;
        col *= mix(0.82, 1.0, smoothstep(horizonY - 0.25, horizonY, uv.y));

        float vignette = smoothstep(0.4, 1.35, length(vec2((uv.x - 0.5) * aspect * 0.8, uv.y - 0.5)));
        col *= 1.0 - vignette * 0.5;

        col = mix(col, mix(uBase, col, 0.35), shield);

        gl_FragColor = vec4(col, ctaEdges(gl_FragCoord.xy));
        #include <colorspace_fragment>
        gl_FragColor.rgb += (ctaHash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
      }
    `,
  });
  return blendedOpaque(material);
}

/**
 * The glossy graphite floor the plinth stands on, in the core's own space:
 * it fades out into the environment, carries a soft contact shadow and
 * ambient occlusion around the plinth, a warm pool where the core's light
 * falls, and a faint streak reflecting the core toward the viewer.
 */
export function createFloor(
  theme: ThemeColors,
  shield: ShieldUniforms,
): ShaderMaterial {
  const material = new ShaderMaterial({
    toneMapped: false,
    uniforms: {
      ...shield,
      uOpacity: { value: 0 },
      uWarm: { value: 0 },
      uGraphite: { value: graphiteOf(theme).multiplyScalar(0.85) },
      uEmber: { value: orangeOf(theme.brand500, 0.1) },
      uPlinth: { value: 0.76 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vLocal;
      void main() {
        vLocal = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vLocal;
      uniform float uOpacity;
      uniform float uWarm;
      uniform vec3 uGraphite;
      uniform vec3 uEmber;
      uniform float uPlinth;
      ${SHIELD_GLSL}
      void main() {
        float r = length(vLocal);
        float contact = 1.0 - smoothstep(uPlinth * 0.92, uPlinth * 1.25, r);
        float ao = 1.0 - smoothstep(uPlinth, uPlinth * 2.4, r);
        float pool = exp(-pow(r / (uPlinth * 1.9), 2.0));
        float streak = exp(-pow(vLocal.x / (uPlinth * 0.35), 2.0)) * smoothstep(-uPlinth, -uPlinth * 3.2, vLocal.y) * exp(vLocal.y * 0.5);
        float extent = 1.0 - smoothstep(0.35, 1.0, length(vec2(vLocal.x / 3.6, vLocal.y / 2.6)));

        vec3 col = uGraphite + uEmber * (pool * 0.05 + streak * 0.035) * uWarm;
        col *= 1.0 - 0.55 * ao - 0.35 * contact;
        float alpha = extent * (0.5 + 0.35 * ao + 0.15 * contact);

        col = mix(col, uShade * 0.8, ctaShield(gl_FragCoord.xy) * 0.8);
        gl_FragColor = vec4(col, alpha * uOpacity * ctaEdges(gl_FragCoord.xy));
        #include <colorspace_fragment>
      }
    `,
  });
  return blendedOpaque(material);
}
