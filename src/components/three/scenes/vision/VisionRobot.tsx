"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  type IUniform,
  type Material,
  type Mesh,
  type PointLight,
} from "three";
import { journeyState } from "@/lib/motion/journeyState";
import { damp } from "@/lib/motion/mathUtils";
import { DISCIPLINE_COLORS } from "@/lib/motion/heroFocus";
import { visionFocus } from "@/lib/motion/visionFocus";
import { irisFragment, planeVertex } from "@/components/three/scenes/vision/visionShaders";
import { armourCap, finBlade, limbShell, roundedBox } from "@/components/three/scenes/vision/robotGeometry";

/**
 * The Vision Unit, VU-07 "Sentinel" — Chapter 07's character
 * (three/scenes/FutureScene.tsx), designed for D3-SG rather than as a
 * generic humanoid. Built in metres (about 1.45 m to the top of its halo,
 * floor at the origin, facing +z), compact and balanced: it hovers above
 * its projected scan field instead of standing on long legs.
 *
 * - Head: a wide glazed-ceramic helmet with a black glass faceplate and two
 *   ember eyes drawn in a shader, so they can look, blink, squint happily
 *   and widen; an orange crest stripe; titanium ear pods with swept-back
 *   ceramic fins that perk up when it pays attention; and a floating
 *   titanium halo with three orange arcs, turning behind the head.
 * - Torso: a sculpted V-taper in white ceramic with orange side vents, an
 *   orange-ringed aperture core in the chest (an eight-bladed iris that
 *   narrows as the cursor comes near), a titanium collar and a graphite
 *   back unit.
 * - Floating shoulder plates, graphite joints, ceramic gauntlets with orange
 *   cuffs and LED strips, and three-fingered graphite hands; the right one
 *   raised, palm up, holding the hologram — three rings in the Data /
 *   Dynamics / Digital colours.
 * - Below the waist (exposed graphite core and titanium pistons), a
 *   thruster pod with an orange band, two gyro rings and a soft downward
 *   thrust glow.
 *
 * Behaviour (all damped, so it stays elegant), built on the original
 * Vision Unit's: the head, chest and whole body turn towards the cursor in
 * decreasing measure and it banks and leans as it hovers; the raised arm
 * presents the hologram towards the cursor, extending as it reaches; when
 * the cursor comes close, the left hand lifts and waves, the eyes squint
 * happily and the head tilts; quick movement widens the eyes, spins the
 * halo, gyros and hologram up and brightens the thrust; when the cursor
 * returns after a pause, it gives a small nod of recognition. Left alone,
 * it breathes, bobs, looks around and blinks. The ring of the active Vision
 * pillar (`visionFocus`) glows brighter in the hologram. The physical
 * materials come in from the scene (studio reflections, fading together);
 * this component owns its glows.
 */

export interface VisionRobotMaterials {
  ceramic: Material;
  paint: Material;
  graphite: Material;
  titanium: Material;
  rubber: Material;
  accent: Material;
  visor: Material;
}

interface Props {
  materials: VisionRobotMaterials;
  segments: number;
  /** Softer glows on portrait screens. */
  dim: boolean;
  /** The body's yaw in world space, so the head's gaze is measured from it. */
  facing: number;
}

/** Height of the hover pod's centre, and of the chest's base (waist top). */
const POD_Y = 0.5;
const CHEST_BASE_Y = 0.72;
/** Chest-local heights of the aperture core and the shoulders. */
const CORE_Y = 0.2;
const SHOULDER_Y = 0.29;
const UPPER_ARM = 0.22;
const FOREARM = 0.21;
/** Head geometry scale (wide, slightly flattened helmet). */
const HEAD_SCALE = [1.22, 0.95, 1.05] as const;
const HEAD_R = 0.128;
/** The hover sits this far below the body's design heights. */
const HOVER_DROP = -0.1;

const glowFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    float a = (exp(-r * r * 5.0) * 0.8 + exp(-r * r * 40.0) * 0.4) * uIntensity;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

/**
 * The eyes, drawn on a patch of the faceplate: two rounded ember lenses that
 * shift with the gaze, close to blink, open wider with excitement and bend
 * into happy arcs when greeting. Faint scanlines keep them "screen" lights.
 */
const eyeFragment = /* glsl */ `
  uniform vec2 uGaze;
  uniform float uBlink;
  uniform float uHappy;
  uniform float uWide;
  uniform float uIntensity;
  uniform float uTime;
  varying vec2 vUv;
  float roundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  void main() {
    vec2 p = vUv - 0.5;
    p.x *= 3.0;
    vec2 gaze = uGaze * vec2(0.32, 0.12);
    float light = 0.0;
    for (int i = 0; i < 2; i++) {
      float side = i == 0 ? -1.0 : 1.0;
      vec2 q = p - vec2(side * 0.46, 0.02) - gaze;
      float h = mix(0.25, 0.31, uWide) * (1.0 - uBlink * 0.9);
      float lens = roundBox(q, vec2(0.13, max(h, 0.02)), 0.12);
      // Happy: an upward arc (^), like a smile in the eyes.
      vec2 a = q - vec2(0.0, -0.2);
      float arc = abs(length(a) - 0.24) - 0.055;
      arc = max(arc, -(a.y - 0.08));
      float d = mix(lens, arc, uHappy);
      light += 1.0 - smoothstep(-0.01, 0.015, d);
      light += exp(-max(d, 0.0) * 22.0) * 0.4;
    }
    float scan = 0.82 + 0.18 * sin(vUv.y * 160.0 - uTime * 4.0);
    vec3 col = mix(vec3(1.0, 0.34, 0.16), vec3(1.0, 0.74, 0.55), clamp(light - 0.8, 0.0, 1.0) * 0.6);
    float alpha = clamp(light, 0.0, 1.4) * scan * uIntensity;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

/** Soft contact shadow under the pod; tighter and darker as it dips. */
const shadowFragment = /* glsl */ `
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float a = exp(-dot(p, p) * 4.2) * 0.75 * uOpacity;
    gl_FragColor = vec4(0.0, 0.0, 0.0, a);
  }
`;

/** The projected scan field: polar grid, ember ring, pulsing rings,
 * rotating HUD arcs and tick marks. Plane is 2.8 m across. */
const fieldFragment = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uEnergy;
  varying vec2 vUv;
  const float TAU = 6.2831853;
  float aaLine(float x, float w) {
    float d = abs(fract(x - 0.5) - 0.5) / max(fwidth(x), 1e-4);
    return 1.0 - smoothstep(w - 0.5, w + 0.5, d);
  }
  void main() {
    vec2 p = (vUv - 0.5) * 2.8;
    float r = length(p);
    float ang = atan(p.y, p.x);
    float fade = 1.0 - smoothstep(0.55, 1.35, r);
    vec3 ember = vec3(1.0, 0.36, 0.2);
    vec3 steel = vec3(0.55, 0.62, 0.74);

    float circles = aaLine(r * 6.0, 0.6) * step(0.5, r);
    float spokes = aaLine(ang / TAU * 36.0, 0.6) * smoothstep(0.52, 0.6, r);
    vec3 col = steel * (circles * 0.22 + spokes * 0.1) * fade;

    col += ember * exp(-pow((r - 0.42) * 110.0, 2.0)) * 1.1;
    col += ember * exp(-r * r * 9.0) * 0.16;

    for (int i = 0; i < 2; i++) {
      float ph = fract(uTime * 0.28 + float(i) * 0.5);
      float rr = 0.42 + ph * 0.9;
      col += ember * exp(-pow((r - rr) * 38.0, 2.0)) * (1.0 - ph) * (0.35 + uEnergy * 0.6) * fade;
    }

    float arcs = exp(-pow((r - 0.6) * 160.0, 2.0)) * step(0.55, fract((ang + uTime * 0.22) / TAU * 3.0));
    float arcs2 = exp(-pow((r - 0.66) * 220.0, 2.0)) * step(0.7, fract((ang - uTime * 0.14) / TAU * 5.0));
    float ticks = step(0.8, fract(ang / TAU * 72.0)) * step(0.7, r) * (1.0 - step(0.74, r));
    col += steel * (arcs * 0.7 + arcs2 * 0.5 + ticks * 0.35) * fade;

    float a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
    gl_FragColor = vec4(col * uIntensity, a * uIntensity);
  }
`;

/** Thrust under the pod: a soft cone of warm light, flickering gently. */
const thrustFragment = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float along = vUv.y;
    float core = pow(along, 2.4);
    float flicker = 0.85 + 0.15 * sin(uTime * 23.0 + vUv.x * 40.0) * sin(uTime * 7.0);
    float streak = 0.7 + 0.3 * sin(vUv.x * 50.0 + uTime * 5.0);
    float a = core * flicker * streak * 0.35 * uIntensity;
    gl_FragColor = vec4(mix(vec3(1.0, 0.36, 0.18), vec3(1.0, 0.8, 0.62), core) * a, a);
  }
`;

function makeGlow(color: string) {
  return new ShaderMaterial({
    vertexShader: planeVertex,
    fragmentShader: glowFragment,
    uniforms: { uColor: { value: new Color(color) }, uIntensity: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

export function VisionRobot({ materials: M, segments, dim, facing }: Props) {
  const camera = useThree((state) => state.camera);
  const seg = segments;

  const bodyRef = useRef<Group>(null);
  const floatRef = useRef<Group>(null);
  const podRef = useRef<Group>(null);
  const gyroARef = useRef<Group>(null);
  const gyroBRef = useRef<Group>(null);
  const chestRef = useRef<Group>(null);
  const neckRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const haloRef = useRef<Group>(null);
  const finLRef = useRef<Group>(null);
  const finRRef = useRef<Group>(null);
  const plateLRef = useRef<Group>(null);
  const plateRRef = useRef<Group>(null);
  const shoulderLRef = useRef<Group>(null);
  const shoulderRRef = useRef<Group>(null);
  const elbowLRef = useRef<Group>(null);
  const elbowRRef = useRef<Group>(null);
  const wristLRef = useRef<Group>(null);
  const wristRRef = useRef<Group>(null);
  const palmRef = useRef<Group>(null);
  const holoRootRef = useRef<Group>(null);
  const holoRef = useRef<Group>(null);
  const holoRingsRef = useRef<Array<Mesh | null>>([]);
  const shadowRef = useRef<Mesh>(null);
  const coreLightRef = useRef<PointLight>(null);
  const holoLightRef = useRef<PointLight>(null);
  const thrustLightRef = useRef<PointLight>(null);

  const G = useMemo(() => {
    const s = seg;
    const sphere = (r: number) => new SphereGeometry(r, s, Math.round(s * 0.66));
    const lathe = (points: number[][], sx: number, sz: number) => {
      const g = new LatheGeometry(
        points.map(([r, y]) => new Vector2(r, y)),
        s
      );
      g.scale(sx, 1, sz);
      g.computeVertexNormals();
      return g;
    };
    const ring = (r: number, tube: number, arc = Math.PI * 2, tubular = 64) => new TorusGeometry(r, tube, 10, tubular, arc);

    // Head: wide glazed helmet, black glass faceplate, eye patch, crest.
    const head = new SphereGeometry(HEAD_R, s, Math.round(s * 0.75));
    head.scale(...HEAD_SCALE);
    const face = new SphereGeometry(HEAD_R * 1.012, s, 24, Math.PI / 2 - 1.0, 2.0, Math.PI / 2 - 0.62, 1.18);
    face.scale(...HEAD_SCALE);
    const eyes = new SphereGeometry(HEAD_R * 1.022, s, 8, Math.PI / 2 - 0.68, 1.36, Math.PI / 2 - 0.3, 0.52);
    eyes.scale(...HEAD_SCALE);
    const crest = new TorusGeometry(HEAD_R * 1.008, 0.0065, 8, 64, 2.1);
    crest.rotateZ(Math.PI / 2 - 1.05);
    crest.rotateY(Math.PI / 2);
    crest.scale(...HEAD_SCALE);
    const earPod = new CylinderGeometry(0.034, 0.038, 0.03, 32);
    earPod.rotateZ(Math.PI / 2);
    const earRing = ring(0.03, 0.004, Math.PI * 2, 40);
    earRing.rotateY(Math.PI / 2);
    const fin = finBlade(0.15, 0.1, 0.012);
    const haloRing = ring(0.215, 0.0045, Math.PI * 2, 140);
    const haloArc = ring(0.215, 0.008, 0.6, 40);

    // Neck + torso.
    const neck = new CylinderGeometry(0.038, 0.046, 0.08, 32);
    const collar = ring(0.072, 0.009);
    collar.rotateX(Math.PI / 2);
    const chest = lathe(
      [
        [0.0005, -0.01],
        [0.088, 0],
        [0.108, 0.05],
        [0.146, 0.13],
        [0.17, 0.2],
        [0.173, 0.26],
        [0.158, 0.31],
        [0.124, 0.35],
        [0.07, 0.372],
        [0.0005, 0.378],
      ],
      1.26,
      0.8
    );
    const coreHousing = new CylinderGeometry(0.068, 0.074, 0.04, 48);
    coreHousing.rotateX(Math.PI / 2);
    const coreDisc = new CircleGeometry(0.048, 64);
    const coreRing = ring(0.054, 0.006);
    const coreBand = ring(0.078, 0.008);
    const vent = roundedBox(0.03, 0.13, 0.12, 0.012, 3);
    const ledBar = new CapsuleGeometry(0.0045, 0.07, 4, 10);
    const backUnit = roundedBox(0.22, 0.2, 0.08, 0.03);

    // Shoulders and arms.
    const plate = armourCap(0.09, 1.2, s);
    plate.scale(1.15, 0.82, 1.05);
    const plateTrim = ring(0.0842, 0.0065, Math.PI * 2, 64);
    plateTrim.rotateX(Math.PI / 2);
    plateTrim.scale(1.15, 1, 1.05);
    const joint = (r: number) => sphere(r);
    const upperArm = limbShell(0.054, 0.045, UPPER_ARM - 0.05, 0.008, s);
    const armCore = new CylinderGeometry(0.026, 0.026, UPPER_ARM, 20);
    const gauntlet = limbShell(0.058, 0.05, FOREARM - 0.05, 0.012, s);
    const cuff = ring(0.051, 0.008);
    cuff.rotateX(Math.PI / 2);
    const palm = roundedBox(0.07, 0.072, 0.032, 0.014, 3);
    const fingerSeg = new CapsuleGeometry(0.0095, 0.026, 4, 12);

    // Waist and hover pod.
    const waist = new CylinderGeometry(0.068, 0.078, 0.1, 40);
    const piston = new CylinderGeometry(0.0075, 0.0075, 0.1, 12);
    const waistRing = ring(0.094, 0.008);
    waistRing.rotateX(Math.PI / 2);
    const pod = lathe(
      [
        [0.0005, -0.17],
        [0.05, -0.165],
        [0.092, -0.14],
        [0.126, -0.09],
        [0.146, -0.02],
        [0.149, 0.04],
        [0.138, 0.09],
        [0.118, 0.12],
        [0.0005, 0.126],
      ],
      1,
      0.92
    );
    const podBand = ring(0.149, 0.011, Math.PI * 2, 96);
    podBand.rotateX(Math.PI / 2);
    podBand.scale(1, 1, 0.92);
    const nozzle = new CylinderGeometry(0.06, 0.074, 0.05, 40, 1, true);
    const nozzleGlow = new CircleGeometry(0.058, 40);
    nozzleGlow.rotateX(Math.PI / 2);
    const gyroA = ring(0.205, 0.0075, Math.PI * 2, 128);
    const gyroB = ring(0.238, 0.005, Math.PI * 2, 128);
    const gyroArc = ring(0.238, 0.009, 0.5, 30);
    const thrust = new ConeGeometry(0.075, 0.34, 40, 1, true);
    thrust.translate(0, -0.17, 0);

    // Scan field + hologram.
    const floor = new PlaneGeometry(1, 1);
    floor.rotateX(-Math.PI / 2);
    const holoRing = (r: number) => new TorusGeometry(r, 0.0016, 6, 96);
    const holoRings = [holoRing(0.055), holoRing(0.072), holoRing(0.09)];
    const holoCore = new SphereGeometry(0.014, 24, 16);
    const holoBeam = new ConeGeometry(0.075, 0.16, 48, 1, true);
    holoBeam.translate(0, 0.08, 0);
    holoBeam.rotateX(Math.PI);
    holoBeam.translate(0, 0.16, 0);
    const plane = new PlaneGeometry(1, 1);

    return {
      head, face, eyes, crest, earPod, earRing, fin, haloRing, haloArc,
      neck, collar, chest, coreHousing, coreDisc, coreRing, coreBand, vent, ledBar, backUnit,
      plate, plateTrim, joint56: joint(0.056), joint44: joint(0.044), joint34: joint(0.034), upperArm, armCore, gauntlet, cuff, palm, fingerSeg,
      waist, piston, waistRing, pod, podBand, nozzle, nozzleGlow, gyroA, gyroB, gyroArc, thrust,
      floor, holoRings, holoCore, holoBeam, plane,
    };
  }, [seg]);

  const glows = useMemo(() => {
    const core = new ShaderMaterial({
      vertexShader: planeVertex,
      fragmentShader: irisFragment,
      uniforms: { uTime: { value: 0 }, uAperture: { value: 0.4 }, uFocus: { value: 0 }, uOpacity: { value: 0 } },
      transparent: true,
    });
    const eyes = new ShaderMaterial({
      vertexShader: planeVertex,
      fragmentShader: eyeFragment,
      uniforms: {
        uGaze: { value: new Vector2() },
        uBlink: { value: 0 },
        uHappy: { value: 0 },
        uWide: { value: 0 },
        uIntensity: { value: 0 },
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const holo = DISCIPLINE_COLORS.map(
      (c) => new MeshBasicMaterial({ color: c, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false })
    );
    const holoCore = new MeshBasicMaterial({ color: "#ffe2c8", transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
    const holoBeam = new MeshBasicMaterial({ color: "#ffb07a", transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
    const nozzle = new MeshBasicMaterial({ color: "#ffb48a", transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
    const shadow = new ShaderMaterial({
      vertexShader: planeVertex,
      fragmentShader: shadowFragment,
      uniforms: { uOpacity: { value: 0 } },
      transparent: true,
      depthWrite: false,
    });
    const field = new ShaderMaterial({
      vertexShader: planeVertex,
      fragmentShader: fieldFragment,
      uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 }, uEnergy: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const thrust = new ShaderMaterial({
      vertexShader: planeVertex,
      fragmentShader: thrustFragment,
      uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    });
    const coreBloom = makeGlow("#ff5a3c");
    const holoBloom = makeGlow("#ffc49a");
    const thrustBloom = makeGlow("#ff6a45");
    return { core, eyes, holo, holoCore, holoBeam, nozzle, shadow, field, thrust, coreBloom, holoBloom, thrustBloom };
  }, []);

  useEffect(
    () => () => {
      Object.values(G).forEach((g) => (Array.isArray(g) ? g.forEach((x) => x.dispose()) : g.dispose()));
      Object.values(glows).forEach((m) => (Array.isArray(m) ? m.forEach((x) => x.dispose()) : m.dispose()));
    },
    [G, glows]
  );

  const gaze = useRef({ yaw: 0, pitch: 0, focus: 0, aperture: 0.4, lastMove: -10, last: new Vector2(), eyeX: 0, eyeY: 0 });
  /** Smoothed body-language state (all damped, so movement stays elegant). */
  const pose = useRef({
    cx: 0, cy: 0, lean: 0, bank: 0, podLag: 0, reach: 0, greet: 0, energy: 0, spin: 0, halo: 0, gyro: 0,
    happy: 0, wide: 0, perk: 0, nodAt: -10, wasIdle: true,
  });
  const tmp = useMemo(
    () => ({ head: new Vector3(), ndc: new Vector3(), dir: new Vector3(), hit: new Vector3(), proj: new Vector3() }),
    []
  );

  useFrame((state, delta) => {
    const weight = journeyState.weight.future;
    if (weight <= 0.001) return;
    const t = state.clock.elapsedTime;
    const fade = Math.min(1, weight * 1.15);
    const glowScale = fade * (dim ? 0.6 : 1);

    // ---- Attention: where the cursor is, relative to the robot ----
    const g = gaze.current;
    const p = pose.current;
    const pointer = journeyState.pointer;
    const moved = Math.abs(pointer.x - g.last.x) + Math.abs(pointer.y - g.last.y);
    if (moved > 0.002) g.lastMove = t;
    g.last.set(pointer.x, pointer.y);
    p.energy = damp(p.energy, Math.min(1, (moved / Math.max(delta, 1 / 240)) * 0.35), moved > 0.002 ? 4 : 1.2, delta);
    const idle = Math.min(1, Math.max(0, (t - g.lastMove - 2.5) / 2));
    const engaged = 1 - idle;
    // The cursor coming back after a pause earns a small nod.
    if (p.wasIdle && idle < 0.5 && moved > 0.002) p.nodAt = t;
    p.wasIdle = idle > 0.9;

    const head = headRef.current;
    if (head) {
      head.getWorldPosition(tmp.head);
      tmp.ndc.set(pointer.x, -pointer.y, 0.5).unproject(camera);
      tmp.dir.copy(tmp.ndc).sub(camera.position).normalize();
      const along = (tmp.head.z + 3 - camera.position.z) / Math.min(tmp.dir.z, -1e-4);
      tmp.hit.copy(camera.position).addScaledVector(tmp.dir, along);
      const dx = tmp.hit.x - tmp.head.x;
      const dy = tmp.hit.y - tmp.head.y;
      const dz = tmp.hit.z - tmp.head.z;
      const followYaw = Math.max(-0.85, Math.min(0.85, (Math.atan2(dx, dz) - facing) * 0.9));
      const followPitch = Math.max(-0.35, Math.min(0.4, Math.atan2(-dy, Math.hypot(dx, dz)) * 0.8));
      const scanYaw = Math.sin(t * 0.19) * 0.5;
      const scanPitch = 0.05 + Math.sin(t * 0.13 + 1) * 0.1;
      g.yaw = damp(g.yaw, followYaw + (scanYaw - followYaw) * idle, 2.4, delta);
      g.pitch = damp(g.pitch, followPitch + (scanPitch - followPitch) * idle, 2.6, delta);

      tmp.proj.copy(tmp.head).project(camera);
      const cx = Math.max(-1, Math.min(1, (pointer.x - tmp.proj.x) * 1.4));
      const cy = Math.max(-1, Math.min(1, (-pointer.y - tmp.proj.y) * 1.4));
      p.cx = damp(p.cx, cx * engaged, 2.2, delta);
      p.cy = damp(p.cy, cy * engaged, 2.2, delta);
      const screenDist = Math.hypot(tmp.proj.x - pointer.x, tmp.proj.y + pointer.y);
      g.focus = damp(g.focus, (1 - Math.min(1, screenDist / 1.1)) * (1 - idle * 0.7), 3, delta);
      g.eyeX = damp(g.eyeX, g.yaw / 0.85, 7, delta);
      g.eyeY = damp(g.eyeY, -g.pitch / 0.4, 7, delta);
    }

    // ---- Body: hover, bank and lean ----
    const breath = Math.sin(t * 1.15);
    const bob = Math.sin(t * 1.05) * 0.016 + Math.sin(t * 0.41) * 0.006;
    p.lean = damp(p.lean, Math.max(0, -p.cy) * 0.09 * engaged + p.energy * 0.03, 2, delta);
    p.bank = damp(p.bank, -p.cx * 0.06 * engaged + Math.sin(t * 0.33) * 0.02 * idle, 1.8, delta);
    p.reach = damp(p.reach, Math.min(1, Math.hypot(p.cx, p.cy)) * engaged, 2, delta);
    p.greet = damp(p.greet, Math.min(1, Math.max(0, (g.focus - 0.35) / 0.4)) * engaged, 1.8, delta);
    p.happy = damp(p.happy, p.greet > 0.55 ? 1 : 0, 5, delta);
    p.wide = damp(p.wide, Math.min(1, p.energy * 1.6), 6, delta);
    p.perk = damp(p.perk, engaged * (0.6 + g.focus * 0.4), 3, delta);
    // The pod swings a beat behind the body, like a pendulum.
    p.podLag = damp(p.podLag, -p.bank * 1.6, 2.4, delta);
    // Halo, gyros and hologram spin up with cursor energy, then wind down.
    p.halo += delta * (0.35 + p.energy * 2.2);
    p.gyro += delta * (0.8 + p.energy * 3);
    const nod = t - p.nodAt < 0.9 ? Math.sin(((t - p.nodAt) / 0.9) * Math.PI * 2) * (1 - (t - p.nodAt) / 0.9) * 0.16 : 0;

    const float = floatRef.current;
    if (float) {
      float.position.y = HOVER_DROP + bob + p.energy * 0.01;
      float.rotation.set(p.lean, g.yaw * 0.32, p.bank);
    }
    if (podRef.current) podRef.current.rotation.set(-p.lean * 0.6, 0, p.podLag);
    if (gyroARef.current) gyroARef.current.rotation.z = p.gyro;
    if (gyroBRef.current) gyroBRef.current.rotation.z = -p.gyro * 0.7;
    if (chestRef.current) {
      chestRef.current.scale.set(1 + breath * 0.006, 1 + breath * 0.01, 1 + breath * 0.008);
      chestRef.current.rotation.set(g.pitch * 0.12 + p.lean * 0.4, g.yaw * 0.22, -p.cx * 0.03);
    }

    // Floating shoulder plates drift on their own; the greeting side lifts.
    if (plateLRef.current) plateLRef.current.position.y = 0.062 + Math.sin(t * 1.7) * 0.004 + p.greet * 0.018;
    if (plateLRef.current) plateLRef.current.rotation.z = 0.12 + p.greet * 0.25;
    if (plateRRef.current) plateRRef.current.position.y = 0.062 + Math.sin(t * 1.7 + 1.4) * 0.004 + p.reach * 0.01;
    if (plateRRef.current) plateRRef.current.rotation.z = -0.12 - p.reach * 0.12;

    // Left arm: relaxed, or raised in a waving greeting.
    const greet = p.greet;
    const wave = Math.sin(t * 6.2) * greet;
    if (shoulderLRef.current)
      shoulderLRef.current.rotation.set(0.06 + breath * 0.012 - greet * 0.5, -greet * 0.2, 0.16 + breath * 0.008 + greet * 0.55 + wave * 0.06);
    if (elbowLRef.current) elbowLRef.current.rotation.set(-0.35 + Math.sin(t * 0.5) * 0.03 - greet * 1.3, 0, 0);
    if (wristLRef.current) wristLRef.current.rotation.set(-0.1 - greet * 0.15, greet * 1.25, wave * 0.35);
    // Right arm: presents the hologram towards the cursor, extending as it reaches.
    const reach = p.reach;
    if (shoulderRRef.current)
      shoulderRRef.current.rotation.set(-0.36 - p.cy * 0.3 - reach * 0.18 + Math.sin(t * 0.6) * 0.02, 0.1 + g.yaw * 0.4, -0.22 - Math.max(0, -p.cx) * 0.2);
    if (elbowRRef.current) elbowRRef.current.rotation.set(-1.2 + reach * 0.45 + Math.sin(t * 0.7 + 1) * 0.03, 0, 0);
    if (wristRRef.current) wristRRef.current.rotation.set(0.2 - reach * 0.25, -1.45, 0);

    // Head: gaze, curious tilt when the cursor lingers close, recognition nod.
    if (head) head.rotation.set(g.pitch * 0.55 + nod, g.yaw * 0.42, -g.yaw * 0.06 + greet * 0.14 * Math.sin(t * 0.8) + p.bank * -0.4);
    if (neckRef.current) neckRef.current.rotation.set(g.pitch * 0.18, g.yaw * 0.14, 0);
    // Fins perk up with attention, with a small flick on quick movement.
    const flick = Math.sin(t * 18) * p.energy * 0.05;
    if (finLRef.current) finLRef.current.rotation.set(-0.55 + p.perk * 0.3 + flick, 0, 0.12 - p.perk * 0.08);
    if (finRRef.current) finRRef.current.rotation.set(-0.55 + p.perk * 0.3 - flick, 0, -0.12 + p.perk * 0.08);
    if (haloRef.current) haloRef.current.rotation.z = p.halo;

    // ---- Glows ----
    let aperture = 0.44 - g.focus * 0.2 + Math.sin(t * 0.9) * 0.012;
    const blinkT = (t + 2) % 6.5;
    const blink = blinkT < 0.22 ? Math.sin((Math.PI * blinkT) / 0.22) : 0;
    if (blinkT < 0.5) aperture *= 1 - 0.9 * Math.sin((Math.PI * blinkT) / 0.5);
    g.aperture = damp(g.aperture, aperture, 16, delta);
    const cu = glows.core.uniforms as Record<string, IUniform>;
    cu.uTime!.value = t;
    cu.uAperture!.value = g.aperture;
    cu.uFocus!.value = g.focus;
    cu.uOpacity!.value = fade;
    const eu = glows.eyes.uniforms as Record<string, IUniform>;
    eu.uTime!.value = t;
    (eu.uGaze!.value as Vector2).set(g.eyeX, g.eyeY);
    eu.uBlink!.value = blink * (1 - p.happy);
    eu.uHappy!.value = p.happy;
    eu.uWide!.value = p.wide;
    eu.uIntensity!.value = (0.75 + g.focus * 0.35) * glowScale;
    (glows.coreBloom.uniforms.uIntensity as IUniform<number>).value = (0.35 + g.focus * 0.45) * glowScale;
    (glows.shadow.uniforms.uOpacity as IUniform<number>).value = fade * (1 - bob * 6);
    shadowRef.current?.scale.setScalar(0.9 + bob * 3);
    const fu = glows.field.uniforms as Record<string, IUniform>;
    fu.uTime!.value = t;
    fu.uIntensity!.value = glowScale;
    fu.uEnergy!.value = p.energy;
    const thrust = (0.75 + p.energy * 0.6 + Math.sin(t * 9) * 0.04) * glowScale;
    const tu = glows.thrust.uniforms as Record<string, IUniform>;
    tu.uTime!.value = t;
    tu.uIntensity!.value = thrust;
    glows.nozzle.opacity = 0.85 * thrust;
    (glows.thrustBloom.uniforms.uIntensity as IUniform<number>).value = 0.5 * thrust;
    if (thrustLightRef.current) thrustLightRef.current.intensity = 0.9 * thrust;
    if (coreLightRef.current) coreLightRef.current.intensity = (0.6 + g.focus * 1.2) * glowScale;

    // Hologram above the raised palm (followed in body space).
    const holo = holoRef.current;
    const body = bodyRef.current;
    if (holo && body && palmRef.current && holoRootRef.current) {
      palmRef.current.getWorldPosition(tmp.hit);
      body.worldToLocal(tmp.hit);
      holoRootRef.current.position.copy(tmp.hit);
      holo.position.y = 0.1 + Math.sin(t * 1.1) * 0.006;
      p.spin += delta * (1 + p.energy * 2.5);
      holo.rotation.y = p.spin * 0.4;
      const lit = visionFocus.pillar;
      holoRingsRef.current.forEach((ring, i) => {
        if (!ring) return;
        ring.rotation.set(p.spin * (0.5 + i * 0.23) + i, p.spin * (0.3 + i * 0.17), i * 0.7);
        ring.scale.setScalar(damp(ring.scale.x, lit === i ? 1.18 : 1, 4, delta));
      });
      glows.holo.forEach((m, i) => {
        const emphasis = lit < 0 ? 1 : lit === i ? 1.35 : 0.5;
        m.opacity = (0.8 + 0.2 * Math.sin(t * 2 + i * 2)) * glowScale * emphasis;
      });
      glows.holoCore.opacity = (0.8 + 0.2 * Math.sin(t * 3.1)) * glowScale;
      glows.holoBeam.opacity = 0.07 * glowScale;
      (glows.holoBloom.uniforms.uIntensity as IUniform<number>).value = 0.35 * glowScale;
      if (holoLightRef.current) holoLightRef.current.intensity = 0.5 * glowScale;
    }
  });

  /* ---- Parts ---- */

  const finger = (x: number, len: number, curl: number, key: string) => (
    <group key={key} position={[x, -0.074, 0.004]} rotation={[curl, 0, 0]}>
      <mesh geometry={G.fingerSeg} material={M.graphite} position={[0, -0.018, 0]} scale={[1, len, 1]} />
      <mesh geometry={G.joint34} material={M.titanium} position={[0, -0.036 * len, 0]} scale={0.26} />
      <group position={[0, -0.04 * len, 0]} rotation={[curl * 1.1, 0, 0]}>
        <mesh geometry={G.fingerSeg} material={M.graphite} position={[0, -0.016, 0]} scale={[0.9, len * 0.8, 0.9]} />
      </group>
    </group>
  );

  const hand = (side: 1 | -1, open: boolean) => (
    <group>
      <mesh geometry={G.joint34} material={M.graphite} scale={0.85} />
      <mesh geometry={G.palm} material={M.graphite} position={[0, -0.042, 0]} />
      <mesh geometry={G.palm} material={M.ceramic} position={[0, -0.04, -0.012]} scale={[0.86, 0.8, 0.35]} />
      {[-0.02, 0, 0.02].map((x, i) => finger(x * side, [0.95, 1.05, 0.92][i] ?? 1, open ? 0.22 : 0.6 + i * 0.06, `f${i}`))}
      <group position={[0.038 * side, -0.036, 0.012]} rotation={[0.4, 0, side * (open ? 0.95 : 0.6)]}>
        <mesh geometry={G.fingerSeg} material={M.graphite} position={[0, -0.018, 0]} />
      </group>
    </group>
  );

  const arm = (side: 1 | -1) => {
    const shoulder = side === 1 ? shoulderLRef : shoulderRRef;
    const elbow = side === 1 ? elbowLRef : elbowRRef;
    const wrist = side === 1 ? wristLRef : wristRRef;
    const plateRef = side === 1 ? plateLRef : plateRRef;
    return (
      <group position={[0.235 * side, SHOULDER_Y, 0]}>
        {/* Floating shoulder plate, with an orange trim at its rim. */}
        <group ref={plateRef} position={[0.018 * side, 0.062, 0]}>
          <mesh geometry={G.plate} material={M.ceramic} />
          <mesh geometry={G.plateTrim} material={M.paint} position={[0, 0.0298, 0]} />
        </group>
        <group ref={shoulder}>
          <mesh geometry={G.joint56} material={M.graphite} />
          <mesh geometry={G.armCore} material={M.graphite} position={[0, -UPPER_ARM / 2, 0]} />
          <mesh geometry={G.upperArm} material={M.ceramic} position={[0, -0.038, 0]} />
          <group ref={elbow} position={[0, -UPPER_ARM, 0]}>
            <mesh geometry={G.joint44} material={M.graphite} />
            <mesh geometry={G.gauntlet} material={M.ceramic} position={[0, -0.028, 0]} />
            <mesh geometry={G.ledBar} material={M.accent} position={[0.056 * side, -0.1, 0.012]} rotation={[0, 0, side * 0.08]} />
            <mesh geometry={G.cuff} material={M.paint} position={[0, -FOREARM + 0.022, 0]} />
            <group ref={wrist} position={[0, -FOREARM, 0]}>
              {side === -1 ? (
                <group>
                  {hand(side, true)}
                  <group ref={palmRef} position={[0, -0.05, 0]} />
                </group>
              ) : (
                hand(side, false)
              )}
            </group>
          </group>
        </group>
      </group>
    );
  };

  return (
    <group ref={bodyRef}>
      {/* The scan field it hovers over. */}
      <mesh ref={shadowRef} geometry={G.floor} material={glows.shadow} position={[0, 0.001, 0]} renderOrder={1} />
      <mesh geometry={G.floor} material={glows.field} position={[0, 0.002, 0]} scale={2.8} renderOrder={2} />

      {/* The hologram above the open right palm, with a faint beam of light up from it. */}
      <group ref={holoRootRef}>
        <group ref={holoRef}>
          {G.holoRings.map((geo, i) => (
            <mesh
              key={i}
              geometry={geo}
              material={glows.holo[i]}
              ref={(mesh) => {
                holoRingsRef.current[i] = mesh;
              }}
            />
          ))}
          <mesh geometry={G.holoCore} material={glows.holoCore} />
          <mesh geometry={G.plane} material={glows.holoBloom} scale={0.34} />
          <pointLight ref={holoLightRef} color="#ffc49a" intensity={0} distance={0.8} decay={2} />
        </group>
        <mesh geometry={G.holoBeam} material={glows.holoBeam} position={[0, 0.02, 0]} scale={[1, 0.55, 1]} />
      </group>

      <group ref={floatRef}>
        {/* Hover pod: ceramic shell, orange band, gyro rings, thruster. */}
        <group ref={podRef} position={[0, POD_Y, 0]}>
          <mesh geometry={G.pod} material={M.ceramic} />
          <mesh geometry={G.podBand} material={M.paint} position={[0, 0.01, 0]} />
          <mesh geometry={G.nozzle} material={M.graphite} position={[0, -0.18, 0]} />
          <mesh geometry={G.nozzleGlow} material={glows.nozzle} position={[0, -0.2, 0]} rotation={[Math.PI, 0, 0]} />
          <mesh geometry={G.thrust} material={glows.thrust} position={[0, -0.2, 0]} renderOrder={3} />
          <mesh geometry={G.plane} material={glows.thrustBloom} position={[0, -0.22, 0.02]} scale={0.32} />
          <pointLight ref={thrustLightRef} color="#ff6a45" intensity={0} distance={0.9} decay={2} position={[0, -0.3, 0]} />
          <group rotation={[1.35, 0, 0.18]}>
            <group ref={gyroARef}>
              <mesh geometry={G.gyroA} material={M.titanium} />
            </group>
          </group>
          <group rotation={[1.72, 0.3, -0.25]}>
            <group ref={gyroBRef}>
              <mesh geometry={G.gyroB} material={M.graphite} />
              {[0, 2.1, 4.2].map((r) => (
                <mesh key={r} geometry={G.gyroArc} material={M.accent} rotation={[0, 0, r]} />
              ))}
            </group>
          </group>
        </group>

        {/* Exposed waist: graphite core, titanium pistons and rings. */}
        <mesh geometry={G.waist} material={M.graphite} position={[0, 0.67, 0]} />
        <mesh geometry={G.waistRing} material={M.titanium} position={[0, 0.628, 0]} />
        <mesh geometry={G.waistRing} material={M.titanium} position={[0, 0.712, 0]} scale={0.92} />
        {[0.785, 2.356, 3.927, 5.498].map((a) => (
          <mesh key={a} geometry={G.piston} material={M.titanium} position={[Math.cos(a) * 0.084, 0.67, Math.sin(a) * 0.084]} />
        ))}

        <group ref={chestRef} position={[0, CHEST_BASE_Y, 0]}>
          <mesh geometry={G.chest} material={M.ceramic} />
          {/* Orange side vents with a status light each. */}
          {[1, -1].map((side) => (
            <group key={side} position={[0.2 * side, 0.17, -0.005]} rotation={[0, 0, side * 0.24]}>
              <mesh geometry={G.vent} material={M.paint} />
              <mesh geometry={G.ledBar} material={M.accent} position={[0.017 * side, 0, 0.03]} scale={[1, 0.8, 1]} />
            </group>
          ))}
          <mesh geometry={G.backUnit} material={M.graphite} position={[0, 0.2, -0.13]} />
          {[1, -1].map((side) => (
            <mesh key={side} geometry={G.ledBar} material={M.accent} position={[0.06 * side, 0.2, -0.172]} />
          ))}
          {/* The aperture core, in an orange-ringed housing. */}
          <mesh geometry={G.coreHousing} material={M.graphite} position={[0, CORE_Y, 0.118]} />
          <mesh geometry={G.coreBand} material={M.paint} position={[0, CORE_Y, 0.128]} />
          <mesh geometry={G.coreRing} material={M.titanium} position={[0, CORE_Y, 0.139]} />
          <mesh geometry={G.coreDisc} material={glows.core} position={[0, CORE_Y, 0.1395]} />
          <mesh geometry={G.plane} material={glows.coreBloom} position={[0, CORE_Y, 0.146]} scale={0.3} />
          <pointLight ref={coreLightRef} color="#ff5a3c" intensity={0} distance={0.9} decay={2} position={[0, CORE_Y, 0.24]} />
          <mesh geometry={G.collar} material={M.titanium} position={[0, 0.372, 0]} />

          {arm(1)}
          {arm(-1)}

          <group ref={neckRef} position={[0, 0.372, 0]}>
            <mesh geometry={G.neck} material={M.graphite} position={[0, 0.035, 0]} />
            <group ref={headRef} position={[0, 0.15, 0]}>
              <mesh geometry={G.head} material={M.ceramic} />
              <mesh geometry={G.face} material={M.visor} />
              <mesh geometry={G.eyes} material={glows.eyes} renderOrder={3} />
              <mesh geometry={G.crest} material={M.paint} />
              {[1, -1].map((side) => (
                <group key={side} position={[0.152 * side, -0.004, -0.01]}>
                  <mesh geometry={G.earPod} material={M.titanium} />
                  <mesh geometry={G.earRing} material={M.accent} position={[0.016 * side, 0, 0]} />
                  <group ref={side === 1 ? finLRef : finRRef} position={[0.012 * side, 0.01, -0.005]}>
                    <mesh geometry={G.fin} material={M.ceramic} />
                  </group>
                </group>
              ))}
              {/* Floating halo behind the head. */}
              <group position={[0, 0.035, -0.16]} rotation={[0.12, 0, 0]}>
                <group ref={haloRef}>
                  <mesh geometry={G.haloRing} material={M.titanium} />
                  {[0, 2.094, 4.189].map((r) => (
                    <mesh key={r} geometry={G.haloArc} material={M.accent} rotation={[0, 0, r]} />
                  ))}
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
