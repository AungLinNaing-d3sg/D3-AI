import {
  CustomBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  ShaderMaterial,
  SrcAlphaFactor,
  Vector2,
  ZeroFactor,
} from "three";
import {
  graphiteOf,
  NOISE_GLSL,
  orangeOf,
  SHIELD_GLSL,
  type ShieldUniforms,
} from "@/components/three/scenes/ctaCore/materials";
import type { ThemeColors } from "@/lib/three/themeColors";

/**
 * Shaders for Chapter 06's background environment
 * (three/scenes/GameAmbienceScene.tsx). The content-safe mask, noise and the
 * shared glow-point/glass/metal treatments come from the same toolkit as
 * Chapter 08 (three/scenes/ctaCore/materials.ts); these are the pieces
 * specific to this chapter: its studio atmosphere, the network's link
 * activity, the glass data channels and the soft light streaks.
 */

/** Additive light that leaves the target's alpha alone (see ctaCore). */
function additive(material: ShaderMaterial): ShaderMaterial {
  material.transparent = true;
  material.depthWrite = false;
  material.blending = CustomBlending;
  material.blendSrc = OneFactor;
  material.blendDst = OneFactor;
  material.blendSrcAlpha = ZeroFactor;
  material.blendDstAlpha = OneFactor;
  material.toneMapped = false;
  return material;
}

/**
 * The environment, in screen space and in depth layers: a deep graphite /
 * midnight foundation with warm charcoal low down; cyan-blue light around the
 * network structure (right/back); burnt-orange light around the processing
 * structure (left/back), scattered by slowly drifting volumetric haze with
 * very faint rays; violet depth at the top; depth fog toward the horizon; and
 * a vignette. Game responses live here too — the success light wave that
 * travels out from the core, and the brief amber disturbance of a failure.
 * Behind the UI it flattens toward the foundation. Blended in the opaque list
 * (drawn first), fading with the chapter's crossfade weight.
 */
export function createGameEnvironment(theme: ThemeColors, shield: ShieldUniforms): ShaderMaterial {
  const material = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    transparent: false,
    uniforms: {
      ...shield,
      uOpacity: { value: 0 },
      uTime: { value: 0 },
      uCore: { value: new Vector2(0.2, 0.5) },
      uCoreSize: { value: 0.25 },
      uNet: { value: new Vector2(0.8, 0.55) },
      uNetSize: { value: 0.3 },
      uWake: { value: 0 },
      uActivity: { value: 0 },
      uWave: { value: 0 },
      uWaveStrength: { value: 0 },
      uDisturb: { value: 0 },
      uBase: { value: theme.base.clone().lerp(theme.ink900, 0.45) },
      uGraphite: { value: graphiteOf(theme) },
      uCharcoal: { value: graphiteOf(theme).lerp(orangeOf(theme.brand800, 0.4), 0.07) },
      uWarm: { value: orangeOf(theme.brand600, 0.1) },
      uAmber: { value: orangeOf(theme.brand400) },
      uCyan: { value: theme.cyan400.clone().lerp(theme.ink300, 0.3) },
      uBlue: { value: theme.cyan400.clone().lerp(theme.violet400, 0.45) },
      uViolet: { value: theme.violet400.clone() },
      uAlarm: { value: theme.brand500.clone().offsetHSL(-0.01, 0, 0) },
    },
    vertexShader: /* glsl */ `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform float uTime;
      uniform vec2 uCore;
      uniform float uCoreSize;
      uniform vec2 uNet;
      uniform float uNetSize;
      uniform float uWake;
      uniform float uActivity;
      uniform float uWave;
      uniform float uWaveStrength;
      uniform float uDisturb;
      uniform vec3 uBase;
      uniform vec3 uGraphite;
      uniform vec3 uCharcoal;
      uniform vec3 uWarm;
      uniform vec3 uAmber;
      uniform vec3 uCyan;
      uniform vec3 uBlue;
      uniform vec3 uViolet;
      uniform vec3 uAlarm;
      ${NOISE_GLSL}
      ${SHIELD_GLSL}

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution;
        float aspect = uResolution.x / uResolution.y;
        vec2 q = vec2(uv.x * aspect, uv.y);
        float shield = ctaShield(gl_FragCoord.xy);
        float presence = 0.35 + 0.65 * uWake;
        float busy = 0.8 + 0.4 * uActivity;

        vec3 col = mix(uCharcoal, uGraphite, smoothstep(-0.1, 0.5, uv.y));
        col = mix(col, uBase, smoothstep(0.5, 1.1, uv.y));

        vec2 vt = vec2((uv.x - 0.5) * aspect * 0.6, uv.y - 1.15);
        col += uViolet * exp(-dot(vt, vt) / 0.35) * 0.02;

        float haze = ctaFbm(q * 1.1 + vec2(uTime * 0.005, -uTime * 0.0025));
        float hazeFine = ctaFbm(q * 3.1 + vec2(-uTime * 0.004, uTime * 0.003) + 5.3);
        float hz = smoothstep(0.3, 0.92, haze * 0.7 + hazeFine * 0.3);
        hz = mix(hz, 0.3, shield);

        vec2 fc = vec2((uv.x - uCore.x) * aspect, uv.y - uCore.y) / max(uCoreSize, 0.02);
        float warmField = exp(-dot(fc * 0.55, fc * 0.55));
        float warmCore = exp(-dot(fc * 1.3, fc * 1.3));
        col += uWarm * warmField * (0.35 + 0.65 * hz) * 0.05 * presence * busy;
        col += uAmber * warmCore * 0.018 * presence * busy;
        float rays = smoothstep(0.55, 0.95, ctaFbm(vec2(atan(fc.y, fc.x) * 6.0, uTime * 0.012)));
        col += uAmber * rays * warmField * (1.0 - warmCore) * 0.01 * presence;

        vec2 fn = vec2((uv.x - uNet.x) * aspect, uv.y - uNet.y) / max(uNetSize, 0.02);
        float coolField = exp(-dot(fn * 0.5, fn * 0.5));
        col += mix(uBlue, uCyan, coolField) * coolField * (0.35 + 0.65 * hz) * 0.05 * presence * busy;
        col += uCyan * hz * 0.012 * presence;

        float horizon = exp(-pow((uv.y - 0.3) * 5.0, 2.0));
        col = mix(col, uGraphite * 1.15, horizon * 0.25 * (0.5 + 0.5 * hz));

        float d = length(fc) * uCoreSize;
        float ring = exp(-pow((d - uWave * 1.3) * 9.0, 2.0)) * (1.0 - uWave);
        col += mix(uAmber, uCyan, clamp(d, 0.0, 1.0)) * ring * 0.06 * uWaveStrength;

        float flicker = 0.6 + 0.4 * ctaNoise(vec2(uTime * 9.0, 1.7));
        col += uAlarm * warmField * 0.035 * uDisturb * flicker;

        float vignette = smoothstep(0.45, 1.35, length(vec2((uv.x - 0.5) * aspect * 0.75, uv.y - 0.5)));
        col *= 1.0 - vignette * 0.5;
        col = mix(col, mix(uBase, col, 0.4), shield);

        gl_FragColor = vec4(col, uOpacity);
        #include <colorspace_fragment>
        gl_FragColor.rgb += (ctaHash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
      }
    `,
  });
  material.blending = CustomBlending;
  material.blendSrc = SrcAlphaFactor;
  material.blendDst = OneMinusSrcAlphaFactor;
  return material;
}

/**
 * The network's links, in one draw: dim cool filaments at rest; now and
 * then a link activates, a short pulse running along it (more often as the
 * playground gets busier); an agent choice brightens them, a success
 * synchronises them all into one pass, and a failure flickers them amber.
 */
export function createNetworkLinkMaterial(theme: ThemeColors, shield: ShieldUniforms): ShaderMaterial {
  return additive(
    new ShaderMaterial({
      uniforms: {
        ...shield,
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uActivity: { value: 0 },
        uSelect: { value: 0 },
        uSync: { value: 0 },
        uDisturb: { value: 0 },
        uCool: { value: theme.cyan300.clone().lerp(theme.ink300, 0.5) },
        uHot: { value: theme.cyan300.clone().lerp(theme.ink50, 0.3) },
        uAccent: { value: theme.cyan300.clone() },
        uAlarm: { value: orangeOf(theme.brand500) },
      },
      vertexShader: /* glsl */ `
        attribute float aT;
        attribute float aSeed;
        varying float vT;
        varying float vSeed;
        void main() {
          vT = aT;
          vSeed = aSeed;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uOpacity;
        uniform float uActivity;
        uniform float uSelect;
        uniform float uSync;
        uniform float uDisturb;
        uniform vec3 uCool;
        uniform vec3 uHot;
        uniform vec3 uAccent;
        uniform vec3 uAlarm;
        varying float vT;
        varying float vSeed;
        ${NOISE_GLSL}
        ${SHIELD_GLSL}
        void main() {
          float cycle = fract(uTime * (0.035 + 0.05 * uActivity) + vSeed * 7.31);
          float firing = smoothstep(0.86, 0.9, cycle) * (1.0 - smoothstep(0.97, 1.0, cycle));
          float head = (cycle - 0.86) / 0.14;
          float pulse = exp(-pow((vT - head) * 7.0, 2.0)) * firing;
          vec3 col = uCool * (0.12 + 0.08 * uActivity + 0.25 * uSelect);
          col += mix(uHot, uAccent, 0.3) * pulse * 0.9;
          col += uHot * uSync * exp(-pow((vT - uSync) * 4.0, 2.0)) * 0.7;
          float flicker = step(0.55, ctaNoise(vec2(uTime * 14.0, vSeed * 40.0)));
          col = mix(col, uAlarm * (0.2 + 0.4 * flicker), uDisturb * 0.6);
          gl_FragColor = vec4(col * uOpacity * (1.0 - ctaShield(gl_FragCoord.xy) * 0.88), 1.0);
          #include <colorspace_fragment>
        }
      `,
    })
  );
}

/**
 * Glass data channels between the network and the processing structure:
 * thin tubes read almost only by their rim (a view-dependent fresnel
 * edge, like light catching the walls of a glass tube), with slow packets of
 * light flowing along them toward the core — cool where they leave the
 * network, warm where they arrive.
 */
export function createChannelMaterial(theme: ThemeColors, shield: ShieldUniforms): ShaderMaterial {
  return additive(
    new ShaderMaterial({
      uniforms: {
        ...shield,
        uFlow: { value: 0 },
        uOpacity: { value: 0 },
        uActivity: { value: 0 },
        uCool: { value: theme.cyan300.clone().lerp(theme.ink200, 0.4) },
        uWarm: { value: orangeOf(theme.brand300) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying float vRim;
        void main() {
          vUv = uv;
          vec3 n = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vRim = pow(1.0 - abs(dot(n, normalize(-mv.xyz))), 2.5);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uFlow;
        uniform float uOpacity;
        uniform float uActivity;
        uniform vec3 uCool;
        uniform vec3 uWarm;
        varying vec2 vUv;
        varying float vRim;
        ${SHIELD_GLSL}
        void main() {
          vec3 tone = mix(uCool, uWarm, smoothstep(0.35, 1.0, vUv.x));
          float packets = pow(0.5 + 0.5 * sin((vUv.x * 5.0 - uFlow) * 6.2832), 10.0);
          float body = 0.06 + vRim * 0.5;
          vec3 col = tone * (body + packets * (0.35 + 0.35 * uActivity));
          gl_FragColor = vec4(col * uOpacity * (1.0 - ctaShield(gl_FragCoord.xy) * 0.9), 1.0);
          #include <colorspace_fragment>
        }
      `,
    })
  );
}

/** Soft, very faint horizontal light streaks near the camera — the nearest
 * depth layer. */
export function createStreakMaterial(theme: ThemeColors, shield: ShieldUniforms): ShaderMaterial {
  return additive(
    new ShaderMaterial({
      uniforms: {
        ...shield,
        uOpacity: { value: 0 },
        uColor: { value: theme.ink100.clone().lerp(theme.cyan300, 0.35) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        uniform vec3 uColor;
        varying vec2 vUv;
        ${SHIELD_GLSL}
        void main() {
          float along = smoothstep(0.0, 0.45, vUv.x) * (1.0 - smoothstep(0.55, 1.0, vUv.x));
          float across = exp(-pow((vUv.y - 0.5) * 6.0, 2.0));
          gl_FragColor = vec4(uColor * along * across * uOpacity * (1.0 - ctaShield(gl_FragCoord.xy) * 0.9), 1.0);
          #include <colorspace_fragment>
        }
      `,
    })
  );
}
