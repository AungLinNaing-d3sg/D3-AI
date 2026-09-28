/**
 * Shared GLSL for the Chapter 07 deep-ocean environment
 * (three/scenes/FutureScene.tsx): value noise, two-layer water caustics
 * (warped so the tiling never reads), the scene's exponential depth fog,
 * the occasional light sweep, and the cursor's underwater "current" — the
 * pointer ray, intersected at each vertex's own depth.
 */

export const OCEAN_FOG_COLOR = "#03191f";

export const oceanCommon = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uSweep;
  uniform vec3 uRayOrigin;
  uniform vec3 uRayDir;
  uniform float uCurrent;

  float oHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float oNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(oHash(i), oHash(i + vec2(1.0, 0.0)), u.x), mix(oHash(i + vec2(0.0, 1.0)), oHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float oFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * oNoise(p); p = p * 2.03 + 11.7; a *= 0.5; }
    return v;
  }

  // One layer of iterated water caustics.
  float oCausticLayer(vec2 uv, float time) {
    vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
    vec2 i = p;
    float c = 1.0;
    float inten = 0.005;
    for (int n = 0; n < 4; n++) {
      float t = time * (1.0 - (3.5 / float(n + 1)));
      i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
      c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
    }
    c /= 4.0;
    c = 1.17 - pow(c, 1.4);
    return pow(abs(c), 8.0);
  }

  // Two layers at unrelated scales, domain-warped — no visible repeat.
  float oCaustics(vec2 p, float time) {
    vec2 warp = vec2(oNoise(p * 0.35 + time * 0.05), oNoise(p * 0.35 - 17.0 - time * 0.04)) * 0.6;
    float a = oCausticLayer(p * 0.16 + warp, time * 0.55);
    float b = oCausticLayer(p * 0.105 - warp * 0.7 + 3.7, time * 0.42 + 2.0);
    return clamp(a * 0.6 + b * 0.5, 0.0, 1.6);
  }

  // A brighter band of light that occasionally sweeps across the scene.
  float oSweep(vec3 world) {
    float band = exp(-pow((world.x - uSweep) * 0.55, 2.0));
    return band;
  }

  float oFog(float depth) {
    return 1.0 - exp(-uFogDensity * uFogDensity * depth * depth);
  }

  // Where the pointer's ray passes this depth (world space).
  vec2 oPointerAt(float z) {
    float t = (z - uRayOrigin.z) / min(uRayDir.z, -0.0001);
    return (uRayOrigin + uRayDir * t).xy;
  }
`;

/* ------------------------------------------------------------------ */
/* Backdrop: the abyss, with a lit surface far above and faint distant   */
/* kelp-forest silhouettes.                                             */
/* ------------------------------------------------------------------ */

export const backdropVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const backdropFragment = /* glsl */ `
  ${oceanCommon}
  varying vec2 vUv;
  void main() {
    vec2 uv = vUv;
    // Vertical depth gradient: the abyss below, a teal glow towards the surface.
    // Low down it *is* the fog — the floor fades into haze with no seam.
    vec3 haze = uFogColor;
    vec3 deep = uFogColor * 0.72;
    vec3 surface = vec3(0.05, 0.25, 0.3);
    vec3 col = mix(haze, deep, smoothstep(0.3, 0.55, uv.y));
    col = mix(col, surface, smoothstep(0.62, 1.0, uv.y));
    // The surface shimmer, far above.
    float shimmer = oFbm(vec2(uv.x * 7.0 + uTime * 0.03, uv.y * 3.0 - uTime * 0.05));
    col += vec3(0.1, 0.3, 0.34) * smoothstep(0.72, 1.0, uv.y) * shimmer * 0.55;
    // Diffuse light where the beams enter.
    col += vec3(0.05, 0.16, 0.2) * exp(-pow((uv.x - 0.5) * 3.2, 2.0)) * smoothstep(0.25, 1.0, uv.y);
    // Distant kelp-forest silhouettes: low-contrast vertical shapes.
    float stalks = oFbm(vec2(uv.x * 18.0, uv.y * 1.2 + sin(uv.x * 30.0 + uTime * 0.2) * 0.02));
    float forest = smoothstep(0.55, 0.75, stalks) * (1.0 - smoothstep(0.1, 0.55, uv.y));
    col *= 1.0 - forest * 0.45;
    // Slow, extremely soft water distortion of the whole backdrop.
    col *= 0.94 + 0.06 * oNoise(uv * 5.0 + uTime * 0.07);
    gl_FragColor = vec4(col, uOpacity);
  }
`;

/* ------------------------------------------------------------------ */
/* Ocean floor: fbm terrain, sand ripples, caustics, fog.               */
/* ------------------------------------------------------------------ */

export const floorVertex = /* glsl */ `
  ${oceanCommon}
  varying vec3 vWorld;
  varying float vDepth;
  void main() {
    vec3 p = position;
    vec4 world = modelMatrix * vec4(p, 1.0);
    float h = oFbm(world.xz * 0.32) * 0.55 + oNoise(world.xz * 1.6) * 0.06;
    // Sand ripples.
    h += sin(world.x * 3.4 + oNoise(world.xz * 0.8) * 4.0) * 0.012;
    world.y += h;
    vWorld = world.xyz;
    vec4 mv = viewMatrix * world;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const floorFragment = /* glsl */ `
  ${oceanCommon}
  uniform float uCaustic;
  uniform float uLightX;
  varying vec3 vWorld;
  varying float vDepth;
  void main() {
    vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    if (n.y < 0.0) n = -n;
    float diffuse = clamp(dot(n, normalize(vec3(0.15, 1.0, 0.2))), 0.0, 1.0);
    vec3 sand = mix(vec3(0.012, 0.045, 0.055), vec3(0.04, 0.11, 0.125), oNoise(vWorld.xz * 2.2) * 0.6 + 0.2);
    vec3 col = sand * (0.35 + 0.65 * diffuse);
    // Light pool under the beams, and caustics dancing through it.
    float pool = exp(-pow((vWorld.x - uLightX) * 0.28, 2.0)) * exp(-pow((vWorld.z + 2.0) * 0.18, 2.0));
    float c = oCaustics(vWorld.xz * 2.6, uTime);
    col += vec3(0.24, 0.62, 0.72) * c * uCaustic * (0.08 + pool * 0.75 + oSweep(vWorld) * 0.4);
    col += vec3(0.03, 0.1, 0.12) * pool;
    col = mix(col, uFogColor, oFog(vDepth));
    // The far edge dissolves into the haze — no horizon line.
    float edgeFade = 1.0 - smoothstep(13.0, 21.0, vDepth);
    gl_FragColor = vec4(col, uOpacity * edgeFade);
  }
`;

/* ------------------------------------------------------------------ */
/* Plants: instanced ribbons swaying on the GPU, bending away from the   */
/* cursor's current, with a bioluminescent tip response.                */
/* ------------------------------------------------------------------ */

export const plantVertex = /* glsl */ `
  ${oceanCommon}
  attribute float aPhase;
  attribute float aFreq;
  attribute float aAmp;
  attribute float aTint;
  uniform float uLean;
  varying vec2 vUv;
  varying float vDepth;
  varying float vTint;
  varying float vNear;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vTint = aTint;
    vec3 p = position;
    float h = p.y;
    // Leaf silhouette: tapers towards the tip, with a gentle waist.
    p.x *= mix(1.0, 0.18, pow(h, 1.3)) * (0.82 + 0.18 * sin(h * 8.0 + aPhase));
    vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
    float bend = h * h;
    // Swaying: per-plant phase/frequency/amplitude plus a travelling current.
    float current = oNoise(vec2(world.x * 0.25 + uTime * 0.12, world.z * 0.25));
    world.x += (sin(uTime * aFreq + aPhase + h * 2.4) * aAmp + (current - 0.5) * aAmp * 0.8 + uLean) * bend;
    world.z += cos(uTime * aFreq * 0.7 + aPhase * 1.3 + h * 1.8) * aAmp * 0.45 * bend;
    // The cursor's current: bend away, strongest closest.
    vec2 pw = oPointerAt(world.z);
    vec2 d = world.xy - pw;
    float dist = length(d);
    float near = smoothstep(1.35, 0.0, dist) * uCurrent;
    vec2 away = d / max(dist, 0.001);
    world.x += away.x * near * 0.5 * bend;
    world.y -= near * 0.06 * bend;
    world.z -= near * 0.18 * bend;
    vNear = near;
    vWorld = world.xyz;
    vec4 mv = viewMatrix * world;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const plantFragment = /* glsl */ `
  ${oceanCommon}
  uniform float uCaustic;
  varying vec2 vUv;
  varying float vDepth;
  varying float vTint;
  varying float vNear;
  varying vec3 vWorld;
  void main() {
    float h = vUv.y;
    vec3 base = vec3(0.01, 0.05, 0.05);
    vec3 kelp = mix(vec3(0.03, 0.2, 0.17), vec3(0.08, 0.36, 0.33), h);
    vec3 violet = mix(vec3(0.07, 0.05, 0.14), vec3(0.3, 0.2, 0.48), h);
    vec3 col = mix(base, mix(kelp, violet, vTint), smoothstep(0.0, 0.5, h));
    // Translucency: light through the leaf, strongest along the midrib.
    float rib = 1.0 - abs(vUv.x * 2.0 - 1.0);
    col += vec3(0.06, 0.2, 0.2) * pow(rib, 3.0) * h;
    // Caustics and the light sweep catching the leaves.
    col += vec3(0.25, 0.6, 0.65) * oCaustics(vWorld.xz * 3.0 + vWorld.y, uTime) * uCaustic * 0.35 * h;
    col += vec3(0.08, 0.2, 0.24) * oSweep(vWorld) * h;
    // Bioluminescent response near the cursor (tips only, restrained).
    col += mix(vec3(0.2, 0.8, 0.9), vec3(0.55, 0.4, 1.0), vTint) * vNear * smoothstep(0.55, 1.0, h) * 0.55;
    col = mix(col, uFogColor, oFog(vDepth));
    float edge = smoothstep(0.0, 0.18, rib);
    gl_FragColor = vec4(col, uOpacity * edge * 0.96);
  }
`;

/* ------------------------------------------------------------------ */
/* Rocks & soft coral: lit from above, caustics, fog.                   */
/* ------------------------------------------------------------------ */

export const rockVertex = /* glsl */ `
  ${oceanCommon}
  attribute float aTint;
  varying vec3 vNormalW;
  varying vec3 vWorld;
  varying float vDepth;
  varying float vTint;
  void main() {
    vTint = aTint;
    vec3 p = position;
    // Organic, softly lumpy surface.
    p += normal * (oNoise(p.xy * 2.3 + p.z * 1.7) - 0.5) * 0.32;
    vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    vWorld = world.xyz;
    vec4 mv = viewMatrix * world;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const rockFragment = /* glsl */ `
  ${oceanCommon}
  uniform float uCaustic;
  varying vec3 vNormalW;
  varying vec3 vWorld;
  varying float vDepth;
  varying float vTint;
  void main() {
    vec3 n = normalize(vNormalW);
    float top = clamp(n.y, 0.0, 1.0);
    vec3 stone = vec3(0.025, 0.06, 0.07);
    vec3 coral = vec3(0.2, 0.08, 0.2);
    vec3 col = mix(stone, coral, vTint) * (0.3 + 0.9 * top);
    col += mix(vec3(0.02, 0.1, 0.12), vec3(0.14, 0.05, 0.16), vTint) * pow(1.0 - abs(n.z), 2.0) * 0.4;
    col += vec3(0.3, 0.7, 0.75) * oCaustics(vWorld.xz * 3.0, uTime) * uCaustic * top * 0.7;
    col = mix(col, uFogColor, oFog(vDepth));
    gl_FragColor = vec4(col, uOpacity);
  }
`;

/* ------------------------------------------------------------------ */
/* Light shafts from the surface.                                       */
/* ------------------------------------------------------------------ */

export const beamVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    // The lower end drifts more than the top — light bending through moving water.
    p.x += sin(uTime * 0.21 + uPhase) * 0.22 * (1.0 - uv.y) + sin(uTime * 0.53 + uPhase * 2.0) * 0.06;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

export const beamFragment = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  uniform float uIntensity;
  uniform vec3 uColor;
  varying vec2 vUv;
  float bHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float bNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(bHash(i), bHash(i + vec2(1.0, 0.0)), u.x), mix(bHash(i + vec2(0.0, 1.0)), bHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  void main() {
    float across = 1.0 - abs(vUv.x * 2.0 - 1.0);
    across = pow(across, 2.4);
    // Brightest near the surface, fading into the depth.
    float along = smoothstep(0.0, 0.55, vUv.y) * (1.0 - smoothstep(0.93, 1.0, vUv.y));
    // Streaks drifting down and flickering like light through ripples.
    float streak = bNoise(vec2(vUv.x * 7.0 + uPhase * 3.0 + uTime * 0.04, vUv.y * 1.6 - uTime * 0.09));
    float flicker = 0.75 + 0.25 * bNoise(vec2(uTime * 0.35 + uPhase * 5.0, 0.0));
    float a = across * along * (0.45 + 0.55 * streak) * flicker * uIntensity;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

/* ------------------------------------------------------------------ */
/* Suspended matter: dust (lit where the beams pass) and plankton.      */
/* ------------------------------------------------------------------ */

export const particleVertex = /* glsl */ `
  ${oceanCommon}
  attribute vec3 aSeed;
  attribute float aSize;
  attribute float aKind;
  uniform float uPixelRatio;
  uniform float uMinY;
  uniform float uSpanY;
  uniform vec4 uBeams[6];
  varying float vAlpha;
  varying float vKind;
  varying float vHue;
  void main() {
    vec3 p = position;
    // Slow rise, wrapping vertically; a gentle side-to-side current.
    p.y = uMinY + mod(p.y - uMinY + uTime * (0.02 + aSeed.x * 0.05), uSpanY);
    p.x += sin(uTime * (0.08 + aSeed.z * 0.1) + aSeed.x * 6.28) * 0.35 + sin(uTime * 0.03 + aSeed.y * 6.28) * 0.2;
    p.z += cos(uTime * (0.06 + aSeed.y * 0.08) + aSeed.z * 6.28) * 0.25;
    vec4 world = modelMatrix * vec4(p, 1.0);
    // The cursor's current pushes nearby matter aside.
    vec2 pw = oPointerAt(world.z);
    vec2 d = world.xy - pw;
    float dist = length(d);
    float near = smoothstep(1.1, 0.0, dist) * uCurrent;
    world.xy += (d / max(dist, 0.001)) * near * (0.35 + aKind * 0.3);
    vec4 mv = viewMatrix * world;
    float depth = -mv.z;
    // Lit where a light shaft passes through it.
    float lit = 0.0;
    for (int i = 0; i < 6; i++) {
      vec4 b = uBeams[i];
      lit += exp(-pow((world.x - b.x) / b.z, 2.0)) * exp(-abs(world.z - b.y) * 0.6) * b.w;
    }
    float fog = 1.0 - (1.0 - exp(-uFogDensity * uFogDensity * depth * depth));
    float pulse = pow(0.5 + 0.5 * sin(uTime * (0.4 + aSeed.x * 0.9) + aSeed.y * 40.0), 6.0);
    float base = aKind > 0.5 ? (0.25 + pulse * 0.9 + near * 0.8) : (0.2 + lit * 1.1);
    vAlpha = base * fog * uOpacity;
    vKind = aKind;
    vHue = aSeed.z;
    gl_PointSize = aSize * uPixelRatio * (7.0 / max(depth, 0.5)) * (aKind > 0.5 ? (1.0 + pulse * 0.6) : 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

export const particleFragment = /* glsl */ `
  varying float vAlpha;
  varying float vKind;
  varying float vHue;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv) * 2.0;
    float disc = exp(-r * r * 4.0);
    vec3 dust = vec3(0.7, 0.9, 0.92);
    vec3 plankton = mix(vec3(0.35, 0.95, 1.0), vec3(0.62, 0.48, 1.0), step(0.7, vHue));
    vec3 col = mix(dust, plankton, vKind);
    float a = disc * vAlpha;
    gl_FragColor = vec4(col * a, a);
  }
`;

/* ------------------------------------------------------------------ */
/* Bubbles: sparse, intermittent, wobbling as they rise.                */
/* ------------------------------------------------------------------ */

export const bubbleVertex = /* glsl */ `
  ${oceanCommon}
  attribute vec3 aSeed;
  uniform float uPixelRatio;
  uniform float uMinY;
  uniform float uSpanY;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float cycle = uTime * (0.1 + aSeed.x * 0.06) + aSeed.y;
    float rise = fract(cycle);
    p.y = uMinY + rise * uSpanY;
    p.x += sin(uTime * (1.4 + aSeed.z) + aSeed.x * 20.0) * 0.05 * rise;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vec2 pw = oPointerAt(world.z);
    vec2 d = world.xy - pw;
    world.x += sign(d.x) * smoothstep(0.9, 0.0, length(d)) * uCurrent * 0.3;
    vec4 mv = viewMatrix * world;
    float depth = -mv.z;
    // Only some cycles release a bubble — never a constant stream.
    float released = step(0.58, oHash(vec2(floor(cycle), aSeed.z * 17.0)));
    float fade = smoothstep(0.0, 0.08, rise) * (1.0 - smoothstep(0.6, 1.0, rise));
    vAlpha = released * fade * (1.0 - oFog(depth)) * uOpacity;
    gl_PointSize = (6.0 + aSeed.x * 10.0) * uPixelRatio * (4.0 / max(depth, 0.5));
    gl_Position = projectionMatrix * mv;
  }
`;

export const bubbleFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv) * 2.0;
    if (r > 1.0) discard;
    float rim = smoothstep(0.7, 0.92, r) * (1.0 - smoothstep(0.92, 1.0, r));
    float glint = exp(-dot(uv - vec2(-0.16, -0.18), uv - vec2(-0.16, -0.18)) * 90.0);
    float a = (rim * 0.55 + glint * 0.8 + 0.04) * vAlpha;
    gl_FragColor = vec4(vec3(0.75, 0.95, 1.0) * a, a);
  }
`;

/* ------------------------------------------------------------------ */
/* Distant fish silhouettes gliding through the light.                  */
/* ------------------------------------------------------------------ */

export const fishVertex = /* glsl */ `
  attribute float aPhase;
  uniform float uTime;
  varying vec2 vUv;
  varying float vPhase;
  void main() {
    vUv = uv;
    vPhase = aPhase;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

export const fishFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vPhase;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    // Body (ellipse) + a flicking tail — just a silhouette.
    float wag = sin(uTime * 3.0 + vPhase * 10.0) * 0.12;
    float body = length(vec2((p.x + 0.15) / 0.62, p.y / 0.26));
    float tailX = p.x - 0.62;
    float tail = step(0.0, tailX) * step(abs(p.y - wag * tailX * 3.0), tailX * 0.9) * step(tailX, 0.34);
    float shape = max(1.0 - smoothstep(0.9, 1.0, body), tail);
    gl_FragColor = vec4(vec3(0.0, 0.03, 0.04), shape * 0.55 * uOpacity);
  }
`;

/* ------------------------------------------------------------------ */
/* Caustics for the logo's physical materials (onBeforeCompile).        */
/* ------------------------------------------------------------------ */

export const logoCausticVertexHead = /* glsl */ `
  varying vec3 vCausticWorld;
`;
export const logoCausticVertexBody = /* glsl */ `
  vCausticWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;
export const logoCausticFragmentHead = /* glsl */ `
  ${oceanCommon}
  uniform float uCaustic;
  varying vec3 vCausticWorld;
`;
export const logoCausticFragmentBody = /* glsl */ `
  float causticLight = oCaustics(vCausticWorld.xz * 3.2 + vCausticWorld.y * 1.4, uTime);
  totalEmissiveRadiance += vec3(0.3, 0.75, 0.85) * causticLight * uCaustic * (0.1 + 0.35 * oSweep(vCausticWorld));
`;
