/**
 * GLSL for Chapter 07's Vision Unit (three/scenes/FutureScene.tsx and
 * vision/VisionRobot.tsx): the aperture iris of the robot's chest core, the
 * studio backdrop with its sonar rings, and the dust drifting through the
 * key light.
 */

const noise = /* glsl */ `
  float sHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float sNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(sHash(i), sHash(i + vec2(1.0, 0.0)), u.x), mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
`;

export const planeVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* ------------------------------------------------------------------ */
/* Iris: machined aperture blades around the pupil, radial fibres, a    */
/* glowing brand-red ring at the pupil's edge, a rotating tick scale    */
/* and a slow scanning arc. `uAperture` is the pupil radius (0..1).     */
/* ------------------------------------------------------------------ */

export const irisFragment = /* glsl */ `
  uniform float uTime;
  uniform float uAperture;
  uniform float uFocus;
  uniform float uOpacity;
  varying vec2 vUv;
  ${noise}
  const float PI = 3.14159265;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float ang = atan(p.y, p.x);

    // Aperture: an 8-bladed polygon that rotates as it opens and closes.
    float blades = 8.0;
    float rot = uAperture * 1.6 + uTime * 0.02;
    float seg = mod(ang + rot, 2.0 * PI / blades) - PI / blades;
    float polyR = r * cos(seg) / cos(PI / blades);
    float open = uAperture;
    float inPupil = 1.0 - smoothstep(open - 0.01, open + 0.005, polyR);

    // Iris body: dark graphite with fine radial fibres.
    float fibres = sNoise(vec2(ang * 34.0, r * 5.0)) * 0.6 + sNoise(vec2(ang * 90.0, r * 12.0)) * 0.4;
    vec3 col = mix(vec3(0.03, 0.035, 0.045), vec3(0.11, 0.1, 0.11), fibres * smoothstep(1.0, 0.4, r));
    // Blade edges catch light.
    float edges = smoothstep(0.02, 0.0, abs(fract((ang + rot) * blades / (2.0 * PI)) - 0.5) - 0.48) * step(open, polyR) * smoothstep(0.62, open, r);
    col += vec3(0.25, 0.26, 0.3) * edges * 0.35;

    // The hot ring at the pupil's edge — the eye's "attention".
    float ring = exp(-pow((polyR - open - 0.035) * 26.0, 2.0));
    vec3 ember = mix(vec3(0.95, 0.24, 0.14), vec3(1.0, 0.62, 0.35), 0.3 + 0.3 * uFocus);
    col += ember * ring * (1.6 + 1.6 * uFocus);
    // Soft inner bloom through the fibres.
    col += ember * 0.34 * exp(-(r - open) * 4.0) * step(open, polyR) * (0.7 + 0.6 * uFocus);

    // Tick scale near the rim, slowly turning.
    float ticks = step(0.82, fract((ang + uTime * 0.05) * 60.0 / (2.0 * PI))) * smoothstep(0.84, 0.86, r) * (1.0 - smoothstep(0.9, 0.92, r));
    col += vec3(0.55, 0.6, 0.68) * ticks * 0.55;
    // Scanning arc.
    float scan = pow(0.5 + 0.5 * cos(ang - uTime * 0.6), 24.0) * smoothstep(0.93, 0.95, r) * (1.0 - smoothstep(0.97, 0.99, r));
    col += vec3(1.0, 0.45, 0.3) * scan * 0.8;

    // Pupil: deep black with a small hot core.
    vec3 pupil = vec3(0.004, 0.004, 0.006) + vec3(1.0, 0.35, 0.2) * exp(-r * r * 900.0) * 0.8;
    col = mix(col, pupil, inPupil);

    gl_FragColor = vec4(col, uOpacity);
  }
`;

/* ------------------------------------------------------------------ */
/* Backdrop: a dark studio sweep with a soft light behind the robot,    */
/* a faint dot lattice around it and sonar rings pulsing outward.       */
/* ------------------------------------------------------------------ */

export const backdropFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec2 uEye;
  uniform vec2 uSize;
  uniform float uSonar;
  varying vec2 vUv;
  ${noise}
  void main() {
    vec2 w = (vUv - 0.5) * uSize;
    vec2 d = w - uEye;
    float r = length(d);

    // Charcoal-navy sweep, lifted slightly towards the top.
    vec3 col = mix(vec3(0.01, 0.012, 0.02), vec3(0.028, 0.03, 0.045), smoothstep(-8.0, 8.0, w.y));
    // The studio light behind the robot: warm core, cool falloff.
    col += vec3(0.16, 0.075, 0.05) * exp(-r * r * 0.06);
    col += vec3(0.03, 0.05, 0.08) * exp(-r * r * 0.012);

    // A faint dot lattice, only near the robot.
    vec2 g = fract(w * 1.6) - 0.5;
    float dots = smoothstep(0.07, 0.0, length(g)) * exp(-r * 0.28) * 0.5;
    col += vec3(0.35, 0.4, 0.5) * dots * 0.12;

    // Sonar rings: a slow pulse outward every few seconds.
    float pulse = fract(uTime / 4.5);
    float ringR = pulse * 9.0;
    float sonar = exp(-pow((r - ringR) * 3.2, 2.0)) * (1.0 - pulse) * uSonar;
    float sonar2 = exp(-pow((r - fract(uTime / 4.5 + 0.5) * 9.0) * 3.2, 2.0)) * (1.0 - fract(uTime / 4.5 + 0.5)) * uSonar;
    col += vec3(0.95, 0.4, 0.28) * (sonar + sonar2 * 0.6) * 0.07;

    // Copy side calmer; vignette; a trace of grain against banding.
    col *= mix(0.6, 1.0, smoothstep(-12.0, 4.0, w.x));
    vec2 v = vUv - 0.5;
    col *= 1.0 - dot(v, v) * 1.1;
    col += (sHash(vUv * 1100.0 + fract(uTime * 9.0)) - 0.5) * 0.008;
    gl_FragColor = vec4(col, uOpacity);
  }
`;

/* ------------------------------------------------------------------ */
/* Dust: fine motes drifting through the key light, brighter and softer */
/* (defocused) the closer they pass to the lens.                        */
/* ------------------------------------------------------------------ */

export const dustVertex = /* glsl */ `
  attribute vec3 aSeed;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uPixelRatio;
  uniform vec3 uEye;
  varying float vAlpha;
  varying float vSoft;
  void main() {
    vec3 p = position;
    p.y += mod(uTime * (0.02 + aSeed.x * 0.04) + aSeed.y * 6.0, 6.0) - 3.0;
    p.x += sin(uTime * (0.07 + aSeed.z * 0.08) + aSeed.x * 6.28) * 0.3;
    p.z += cos(uTime * (0.05 + aSeed.y * 0.06) + aSeed.z * 6.28) * 0.2;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float depth = -mv.z;
    float lit = exp(-length(p - uEye) * 0.55);
    float blur = clamp(abs(depth - 8.0) / 5.0, 0.0, 1.0);
    vSoft = blur;
    vAlpha = uOpacity * (0.12 + lit * 0.7) * (0.4 + 0.6 * aSeed.z) * mix(1.0, 0.4, blur);
    gl_PointSize = (1.4 + aSeed.x * 2.0 + blur * 8.0) * uPixelRatio * (6.0 / max(depth, 1.0));
    gl_Position = projectionMatrix * mv;
  }
`;

export const dustFragment = /* glsl */ `
  varying float vAlpha;
  varying float vSoft;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv) * 2.0;
    float a = mix(exp(-r * r * 5.0), smoothstep(1.0, 0.55, r) * 0.8, vSoft) * vAlpha;
    gl_FragColor = vec4(vec3(1.0, 0.9, 0.8) * a, a);
  }
`;
