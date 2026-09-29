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
  LatheGeometry,
  Group,
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
import { limbShell, roundedBox } from "@/components/three/scenes/vision/robotGeometry";

/**
 * The Vision Unit — a full humanoid robot for Chapter 07
 * (three/scenes/FutureScene.tsx), built in metres (1.82 m tall, feet at the
 * origin, facing +z) from sculpted, tapered shells:
 *
 * - white ceramic armour (head, chest, shoulders, pelvis, limbs, feet) over
 *   dark graphite joints and a segmented spine, with titanium actuators,
 *   rings and ear pods, and brand-red status lights;
 * - a dark glass visor with an ember eye-light that slides towards
 *   whatever the robot is looking at;
 * - a glowing aperture core in the chest (an eight-bladed iris), narrowing as
 *   the cursor comes near;
 * - articulated hands; the right one raised, palm up, holding a small
 *   hologram — three rings in the Data / Dynamics / Digital colours, the
 *   same three trails that orbit the mark in the Hero;
 * - no pedestal: it stands in a projected scan field — a soft contact
 *   shadow, a fine polar grid, an ember ring round its feet, rings pulsing
 *   outward (brighter with cursor energy), rotating HUD arcs and tick
 *   marks, and a faint column of light rising from the ring.
 *
 * Body language follows the cursor, always damped so it stays elegant: the
 * head, neck, chest and hips turn towards it in decreasing measure; its
 * weight settles onto the leg nearer the cursor (the other knee softens,
 * the free foot turns out); it crouches slightly when the cursor is low;
 * the raised right arm presents the hologram towards it, extending as it
 * reaches; when the cursor comes close, the left hand lifts in an
 * open-palm greeting and the head tilts, curious. Quick movement spins the
 * hologram up. Left alone, it breathes, sways slowly and scans. The ring of
 * the active Vision pillar (`visionFocus`) glows brighter in the hologram. The physical materials come in from the scene
 * (studio reflections, fading together); this component owns its glows.
 */

export interface VisionRobotMaterials {
  ceramic: Material;
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

const HIP_Y = 0.97;
const SHOULDER_Y = 1.405;
const THIGH = 0.44;
const SHIN = 0.43;
const UPPER_ARM = 0.29;
const FOREARM = 0.265;

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

/** The visor's eye-light: a warm bar with a bright point that follows the gaze. */
const eyeFragment = /* glsl */ `
  uniform float uGaze;
  uniform float uIntensity;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float band = exp(-pow((vUv.y - 0.5) * 7.0, 2.0));
    float point = exp(-pow((vUv.x - 0.5 - uGaze * 0.22) * 16.0, 2.0));
    float bar = smoothstep(0.1, 0.25, vUv.x) * (1.0 - smoothstep(0.75, 0.9, vUv.x)) * 0.28;
    float scan = exp(-pow((vUv.x - fract(uTime * 0.22)) * 30.0, 2.0)) * 0.25;
    vec3 col = mix(vec3(0.95, 0.22, 0.12), vec3(1.0, 0.7, 0.45), point);
    float a = band * (bar + point * 0.85 + scan) * uIntensity;
    gl_FragColor = vec4(col * a, a);
  }
`;

/** Soft contact shadow under the feet. */
const shadowFragment = /* glsl */ `
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float a = exp(-dot(p * vec2(1.0, 1.35), p * vec2(1.0, 1.35)) * 4.2) * 0.8 * uOpacity;
    gl_FragColor = vec4(0.0, 0.0, 0.0, a);
  }
`;

/** The projected scan field: polar grid, ember foot ring, pulsing rings,
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

    // Fine polar grid, fading out with distance.
    float circles = aaLine(r * 6.0, 0.6) * step(0.5, r);
    float spokes = aaLine(ang / TAU * 36.0, 0.6) * smoothstep(0.52, 0.6, r);
    vec3 col = steel * (circles * 0.22 + spokes * 0.1) * fade;

    // The ember ring round the feet, and a warm glow inside it.
    col += ember * exp(-pow((r - 0.46) * 110.0, 2.0)) * 1.1;
    col += ember * exp(-r * r * 9.0) * 0.12;

    // Rings pulsing outward (brighter with cursor energy).
    for (int i = 0; i < 2; i++) {
      float ph = fract(uTime * 0.28 + float(i) * 0.5);
      float rr = 0.46 + ph * 0.9;
      col += ember * exp(-pow((r - rr) * 38.0, 2.0)) * (1.0 - ph) * (0.35 + uEnergy * 0.6) * fade;
    }

    // Rotating HUD arcs and tick marks.
    float arcs = exp(-pow((r - 0.6) * 160.0, 2.0)) * step(0.55, fract((ang + uTime * 0.22) / TAU * 3.0));
    float arcs2 = exp(-pow((r - 0.66) * 220.0, 2.0)) * step(0.7, fract((ang - uTime * 0.14) / TAU * 5.0));
    float ticks = step(0.8, fract(ang / TAU * 72.0)) * step(0.7, r) * (1.0 - step(0.74, r));
    col += steel * (arcs * 0.7 + arcs2 * 0.5 + ticks * 0.35) * fade;

    float a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
    gl_FragColor = vec4(col * uIntensity, a * uIntensity);
  }
`;

/** A faint column of light rising from the foot ring, with slow streaks. */
const columnFragment = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float up = pow(1.0 - vUv.y, 2.2);
    float streak = 0.6 + 0.4 * sin(vUv.x * 62.0 + uTime * 0.6) * sin(vUv.x * 23.0 - uTime * 0.4);
    float a = up * streak * 0.1 * uIntensity;
    gl_FragColor = vec4(vec3(1.0, 0.45, 0.28) * a, a);
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
  const pelvisRef = useRef<Group>(null);
  const chestRef = useRef<Group>(null);
  const neckRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const hipLRef = useRef<Group>(null);
  const hipRRef = useRef<Group>(null);
  const kneeLRef = useRef<Group>(null);
  const kneeRRef = useRef<Group>(null);
  const ankleLRef = useRef<Group>(null);
  const ankleRRef = useRef<Group>(null);
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
  const coreLightRef = useRef<PointLight>(null);
  const holoLightRef = useRef<PointLight>(null);


  const G = useMemo(() => {
    const s = seg;
    const sphere = (r: number) => new SphereGeometry(r, s, Math.round(s * 0.66));
    // Head: a smooth ceramic helmet with a wraparound visor band.
    const headScale = [0.9, 1.16, 1.0] as const;
    const head = new SphereGeometry(0.104, s, Math.round(s * 0.75));
    head.scale(...headScale);
    const visor = new SphereGeometry(0.1085, s, 20, Math.PI / 2 - 1.1, 2.2, Math.PI / 2 - 0.36, 0.5);
    visor.scale(...headScale);
    const eye = new SphereGeometry(0.1105, s, 6, Math.PI / 2 - 0.85, 1.7, Math.PI / 2 - 0.17, 0.2);
    eye.scale(...headScale);
    const ear = new CylinderGeometry(0.03, 0.034, 0.034, 32);
    ear.rotateZ(Math.PI / 2);
    const earRing = new TorusGeometry(0.03, 0.004, 8, 40);
    earRing.rotateY(Math.PI / 2);
    const neck = new CylinderGeometry(0.036, 0.042, 0.1, 32);
    const neckRing = new TorusGeometry(0.043, 0.005, 8, 40);
    neckRing.rotateX(Math.PI / 2);
    // Chest: a sculpted V-taper from the waist to broad shoulders, flattened front-to-back.
    const chest = new LatheGeometry(
      [
        [0.0005, -0.012],
        [0.08, -0.004],
        [0.092, 0.04],
        [0.112, 0.1],
        [0.138, 0.17],
        [0.151, 0.23],
        [0.147, 0.282],
        [0.124, 0.322],
        [0.084, 0.35],
        [0.04, 0.364],
        [0.0005, 0.367],
      ].map(([r, y]) => new Vector2(r, y)),
      s
    );
    chest.scale(1.32, 1, 0.72);
    chest.computeVertexNormals();
    const abPlate = roundedBox(0.11, 0.075, 0.03, 0.02, 3);
    const coreDisc = new CircleGeometry(0.042, 64);
    const coreRing = new TorusGeometry(0.05, 0.007, 12, 64);
    const backpack = roundedBox(0.2, 0.22, 0.07, 0.03);
    const spine = new CylinderGeometry(0.075, 0.085, 0.032, s);
    const shoulderCap = sphere(0.06);
    shoulderCap.scale(1.1, 0.74, 1.02);
    const joint = (r: number) => sphere(r);
    const pelvis = roundedBox(0.27, 0.12, 0.17, 0.045);
    const groin = sphere(0.06);
    groin.scale(1.3, 0.8, 1);
    const thigh = limbShell(0.072, 0.054, THIGH - 0.05, 0.012, s);
    const shin = limbShell(0.056, 0.04, SHIN - 0.06, 0.01, s);
    const kneecap = sphere(0.038);
    kneecap.scale(1, 1.2, 0.6);
    const calfRod = new CylinderGeometry(0.009, 0.009, 0.28, 16);
    const upperArm = limbShell(0.05, 0.042, UPPER_ARM - 0.05, 0.007, s);
    const forearm = limbShell(0.046, 0.034, FOREARM - 0.05, 0.008, s);
    const wristRing = new TorusGeometry(0.036, 0.005, 8, 40);
    wristRing.rotateX(Math.PI / 2);
    const palm = roundedBox(0.068, 0.082, 0.03, 0.012, 3);
    const fingerSeg = new CapsuleGeometry(0.0078, 0.024, 4, 12);
    const foot = roundedBox(0.105, 0.06, 0.235, 0.025);
    const sole = roundedBox(0.108, 0.014, 0.24, 0.006, 2);
    const toeLight = new CapsuleGeometry(0.0035, 0.06, 4, 8);
    toeLight.rotateZ(Math.PI / 2);
    // Scan field underfoot: flat planes for the shadow and the projection,
    // and an open cylinder for the column of light rising from the ring.
    const floor = new PlaneGeometry(1, 1);
    floor.rotateX(-Math.PI / 2);
    const column = new CylinderGeometry(0.46, 0.46, 0.9, Math.max(64, s), 1, true);
    column.translate(0, 0.45, 0);
    // Hologram.
    const holoRing = (r: number) => new TorusGeometry(r, 0.0016, 6, 96);
    const holoRings = [holoRing(0.055), holoRing(0.072), holoRing(0.09)];
    const holoCore = new SphereGeometry(0.014, 24, 16);
    const holoBeam = new ConeGeometry(0.075, 0.16, 48, 1, true);
    holoBeam.translate(0, 0.08, 0);
    holoBeam.rotateX(Math.PI);
    holoBeam.translate(0, 0.16, 0);
    const plane = new PlaneGeometry(1, 1);
    return {
      head, visor, eye, abPlate, ear, earRing, neck, neckRing, chest, coreDisc, coreRing, backpack, spine,
      shoulderCap, joint60: joint(0.058), joint52: joint(0.052), joint44: joint(0.043), joint38: joint(0.037),
      pelvis, groin, thigh, shin, kneecap, calfRod, upperArm, forearm, wristRing, palm, fingerSeg, foot, sole, toeLight,
      floor, column, holoRings, holoCore, holoBeam, plane,
    };
  }, [seg]);

  const glows = useMemo(() => {
    const core = new ShaderMaterial({
      vertexShader: planeVertex,
      fragmentShader: irisFragment,
      uniforms: { uTime: { value: 0 }, uAperture: { value: 0.4 }, uFocus: { value: 0 }, uOpacity: { value: 0 } },
      transparent: true,
    });
    const eye = new ShaderMaterial({
      vertexShader: planeVertex,
      fragmentShader: eyeFragment,
      uniforms: { uGaze: { value: 0 }, uIntensity: { value: 0 }, uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const holo = DISCIPLINE_COLORS.map(
      (c) => new MeshBasicMaterial({ color: c, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false })
    );
    const holoCore = new MeshBasicMaterial({ color: "#ffe2c8", transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
    const holoBeam = new MeshBasicMaterial({ color: "#ffb07a", transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
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
    const column = new ShaderMaterial({
      vertexShader: planeVertex,
      fragmentShader: columnFragment,
      uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    });
    const coreBloom = makeGlow("#ff5a3c");
    const holoBloom = makeGlow("#ffc49a");
    return { core, eye, holo, holoCore, holoBeam, shadow, field, column, coreBloom, holoBloom };
  }, []);

  useEffect(
    () => () => {
      Object.values(G).forEach((g) => (Array.isArray(g) ? g.forEach((x) => x.dispose()) : g.dispose()));
      Object.values(glows).forEach((m) => (Array.isArray(m) ? m.forEach((x) => x.dispose()) : m.dispose()));
    },
    [G, glows]
  );

  const gaze = useRef({ yaw: 0, pitch: 0, focus: 0, aperture: 0.4, lastMove: -10, last: new Vector2(), eyeX: 0 });
  /** Smoothed body-language state (all damped, so movement stays elegant). */
  const pose = useRef({ cx: 0, cy: 0, shift: 0, crouch: 0, reach: 0, greet: 0, energy: 0, spin: 0 });
  const tmp = useMemo(
    () => ({ head: new Vector3(), ndc: new Vector3(), dir: new Vector3(), hit: new Vector3(), proj: new Vector3(), bodyDir: new Vector3() }),
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
    // Cursor speed → energy (quick movement livens the whole body a little).
    p.energy = damp(p.energy, Math.min(1, (moved / Math.max(delta, 1 / 240)) * 0.35), moved > 0.002 ? 4 : 1.2, delta);
    const idle = Math.min(1, Math.max(0, (t - g.lastMove - 2.5) / 2));
    const engaged = 1 - idle;
    const head = headRef.current;
    const body = bodyRef.current;
    if (head && body) {
      head.getWorldPosition(tmp.head);
      tmp.ndc.set(pointer.x, -pointer.y, 0.5).unproject(camera);
      tmp.dir.copy(tmp.ndc).sub(camera.position).normalize();
      const along = (tmp.head.z + 3 - camera.position.z) / Math.min(tmp.dir.z, -1e-4);
      tmp.hit.copy(camera.position).addScaledVector(tmp.dir, along);
      const dx = tmp.hit.x - tmp.head.x;
      const dy = tmp.hit.y - tmp.head.y;
      const dz = tmp.hit.z - tmp.head.z;
      // Relative to the way the body faces.
      const followYaw = Math.max(-0.85, Math.min(0.85, (Math.atan2(dx, dz) - facing) * 0.9));
      const followPitch = Math.max(-0.35, Math.min(0.4, Math.atan2(-dy, Math.hypot(dx, dz)) * 0.8));
      const scanYaw = Math.sin(t * 0.19) * 0.45;
      const scanPitch = 0.08 + Math.sin(t * 0.13 + 1) * 0.08;
      g.yaw = damp(g.yaw, followYaw + (scanYaw - followYaw) * idle, 2.4, delta);
      g.pitch = damp(g.pitch, followPitch + (scanPitch - followPitch) * idle, 2.6, delta);

      // Screen-space offset of the cursor from the head (x right, y up).
      tmp.proj.copy(tmp.head).project(camera);
      const cx = Math.max(-1, Math.min(1, (pointer.x - tmp.proj.x) * 1.4));
      const cy = Math.max(-1, Math.min(1, (-pointer.y - tmp.proj.y) * 1.4));
      p.cx = damp(p.cx, cx * engaged, 2.2, delta);
      p.cy = damp(p.cy, cy * engaged, 2.2, delta);
      const screenDist = Math.hypot(tmp.proj.x - pointer.x, tmp.proj.y + pointer.y);
      g.focus = damp(g.focus, (1 - Math.min(1, screenDist / 1.1)) * (1 - idle * 0.7), 3, delta);
      g.eyeX = damp(g.eyeX, (g.yaw * 0.28) / 0.85, 6, delta);
    }

    // ---- Body ----
    const breath = Math.sin(t * 1.15);
    // Weight settles onto the leg nearer the cursor; left alone, it sways slowly.
    const sway = Math.sin(t * 0.38);
    p.shift = damp(p.shift, sway * (1 - engaged * 0.7) + Math.max(-1, Math.min(1, p.cx * 1.3)) * engaged * 0.8, 1.8, delta);
    // A slight crouch when the cursor is low; up on its toes a touch when high.
    p.crouch = damp(p.crouch, Math.max(0, -p.cy) * 0.9 * engaged, 2, delta);
    // Reaching: the further the cursor, the more the hologram arm extends towards it.
    p.reach = damp(p.reach, Math.min(1, Math.hypot(p.cx, p.cy)) * engaged, 2, delta);
    // Greeting: the free hand lifts, palm open, when the cursor comes close.
    p.greet = damp(p.greet, Math.min(1, Math.max(0, (g.focus - 0.35) / 0.4)) * engaged, 1.8, delta);
    const shift = p.shift;
    const crouch = p.crouch;

    if (pelvisRef.current) {
      pelvisRef.current.position.set(shift * 0.022, HIP_Y - Math.abs(shift) * 0.008 - crouch * 0.035, crouch * 0.01);
      pelvisRef.current.rotation.set(crouch * 0.05, g.yaw * 0.16, shift * 0.035);
    }
    if (chestRef.current) {
      chestRef.current.scale.set(1 + breath * 0.006, 1 + breath * 0.01, 1 + breath * 0.008);
      // Twist and lean towards the cursor, counter-balancing the hips.
      chestRef.current.rotation.set(g.pitch * 0.18 + crouch * 0.12 + p.energy * 0.02, g.yaw * 0.26, -shift * 0.05 - p.cx * 0.03);
    }
    // Legs: the loaded leg straight, the other softly bent; both bend into the crouch.
    const bendL = 0.05 + Math.max(0, -shift) * 0.14 + crouch * 0.28;
    const bendR = 0.05 + Math.max(0, shift) * 0.14 + crouch * 0.28;
    // The free foot turns out a little towards the cursor's side.
    const turnL = Math.max(0, p.cx) * 0.18;
    const turnR = Math.min(0, p.cx) * 0.18;
    if (hipLRef.current) hipLRef.current.rotation.set(-bendL * 0.62, turnL, 0.05 - shift * 0.035);
    if (hipRRef.current) hipRRef.current.rotation.set(-bendR * 0.62, turnR, -0.05 - shift * 0.035);
    if (kneeLRef.current) kneeLRef.current.rotation.x = bendL * 1.25;
    if (kneeRRef.current) kneeRRef.current.rotation.x = bendR * 1.25;
    if (ankleLRef.current) ankleLRef.current.rotation.set(-bendL * 0.63, -turnL * 0.5, -0.05 + shift * 0.035);
    if (ankleRRef.current) ankleRRef.current.rotation.set(-bendR * 0.63, -turnR * 0.5, 0.05 + shift * 0.035);

    // Left arm: relaxed at the side, or lifted in an open-palm greeting.
    const greet = p.greet;
    if (shoulderLRef.current)
      shoulderLRef.current.rotation.set(0.05 + breath * 0.01 - greet * 0.55, -greet * 0.2, 0.13 + breath * 0.008 + greet * 0.32);
    if (elbowLRef.current) elbowLRef.current.rotation.x = -0.28 + Math.sin(t * 0.5) * 0.02 - greet * 1.35;
    if (wristLRef.current) wristLRef.current.rotation.set(-0.08 - greet * 0.2, greet * 1.2 + Math.sin(t * 2.2) * 0.12 * greet, 0);
    // Right arm: presents the hologram towards the cursor, extending as it reaches.
    const reach = p.reach;
    if (shoulderRRef.current)
      shoulderRRef.current.rotation.set(-0.32 - p.cy * 0.3 - reach * 0.18 + Math.sin(t * 0.6) * 0.02, 0.1 + g.yaw * 0.45, -0.2 - Math.max(0, -p.cx) * 0.2);
    if (elbowRRef.current) elbowRRef.current.rotation.set(-1.25 + reach * 0.45 + Math.sin(t * 0.7 + 1) * 0.03, 0, 0);
    if (wristRRef.current) wristRRef.current.rotation.set(0.2 - reach * 0.25, -1.45, 0);

    // Head: follows the gaze, with a curious tilt when the cursor lingers close.
    if (head) head.rotation.set(g.pitch * 0.62, g.yaw * 0.6, -g.yaw * 0.05 + greet * 0.1 * Math.sin(t * 0.7));
    if (neckRef.current) neckRef.current.rotation.set(g.pitch * 0.2, g.yaw * 0.18, 0);

    // Glows.
    let aperture = 0.44 - g.focus * 0.2 + Math.sin(t * 0.9) * 0.012;
    const blinkT = (t + 2) % 9;
    if (blinkT < 0.5) aperture *= 1 - 0.9 * Math.sin((Math.PI * blinkT) / 0.5);
    g.aperture = damp(g.aperture, aperture, 16, delta);
    const cu = glows.core.uniforms as Record<string, IUniform>;
    cu.uTime!.value = t;
    cu.uAperture!.value = g.aperture;
    cu.uFocus!.value = g.focus;
    cu.uOpacity!.value = fade;
    const eu = glows.eye.uniforms as Record<string, IUniform>;
    eu.uTime!.value = t;
    eu.uGaze!.value = g.eyeX;
    const eyeBlink = blinkT < 0.5 ? 1 - Math.sin((Math.PI * blinkT) / 0.5) * 0.8 : 1;
    eu.uIntensity!.value = (0.7 + g.focus * 0.45) * eyeBlink * glowScale;
    (glows.coreBloom.uniforms.uIntensity as IUniform<number>).value = (0.35 + g.focus * 0.45) * glowScale;
    // Scan field: brighter, and pulsing harder, with cursor energy.
    (glows.shadow.uniforms.uOpacity as IUniform<number>).value = fade;
    const fu = glows.field.uniforms as Record<string, IUniform>;
    fu.uTime!.value = t;
    fu.uIntensity!.value = glowScale;
    fu.uEnergy!.value = p.energy;
    const colu = glows.column.uniforms as Record<string, IUniform>;
    colu.uTime!.value = t;
    colu.uIntensity!.value = (0.8 + p.energy * 0.6) * glowScale;
    if (coreLightRef.current) coreLightRef.current.intensity = (0.6 + g.focus * 1.2) * glowScale;

    // Hologram above the raised palm (followed in body space).
    const holo = holoRef.current;
    if (holo && body && palmRef.current && holoRootRef.current) {
      palmRef.current.getWorldPosition(tmp.hit);
      body.worldToLocal(tmp.hit);
      holoRootRef.current.position.copy(tmp.hit);
      holo.position.y = 0.1 + Math.sin(t * 1.1) * 0.006;
      // Quick cursor movement spins it up; it winds back down after.
      p.spin += delta * (1 + p.energy * 2.5);
      holo.rotation.y = p.spin * 0.4;
      const lit = visionFocus.pillar;
      holoRingsRef.current.forEach((ring, i) => {
        if (!ring) return;
        ring.rotation.set(p.spin * (0.5 + i * 0.23) + i, p.spin * (0.3 + i * 0.17), i * 0.7);
        // The active Vision pillar's discipline ring swells a little.
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
    <group key={key} position={[x, -0.083, 0.004]} rotation={[curl, 0, 0]}>
      <mesh geometry={G.fingerSeg} material={M.graphite} position={[0, -0.018, 0]} scale={[1, len, 1]} />
      <group position={[0, -0.04 * len, 0]} rotation={[curl * 1.2, 0, 0]}>
        <mesh geometry={G.fingerSeg} material={M.graphite} position={[0, -0.016, 0]} scale={[0.9, len * 0.85, 0.9]} />
      </group>
    </group>
  );

  const hand = (side: 1 | -1, open: boolean) => (
    <group>
      <mesh geometry={G.joint38} material={M.graphite} scale={0.75} />
      <mesh geometry={G.palm} material={M.graphite} position={[0, -0.045, 0]} />
      <mesh geometry={G.palm} material={M.ceramic} position={[0, -0.042, -0.011]} scale={[0.9, 0.85, 0.35]} />
      {[-0.022, -0.0075, 0.0075, 0.022].map((x, i) =>
        finger(x * side, [0.95, 1.05, 1, 0.85][i] ?? 1, open ? 0.25 : 0.55 + i * 0.05, `f${i}`)
      )}
      <group position={[0.036 * side, -0.04, 0.012]} rotation={[0.4, 0, side * (open ? 0.9 : 0.6)]}>
        <mesh geometry={G.fingerSeg} material={M.graphite} position={[0, -0.018, 0]} />
      </group>
    </group>
  );

  const arm = (side: 1 | -1) => {
    const shoulder = side === 1 ? shoulderLRef : shoulderRRef;
    const elbow = side === 1 ? elbowLRef : elbowRRef;
    const wrist = side === 1 ? wristLRef : wristRRef;
    return (
      <group ref={shoulder} position={[0.215 * side, SHOULDER_Y - HIP_Y - 0.14, 0]}>
        <mesh geometry={G.joint52} material={M.graphite} />
        <mesh geometry={G.shoulderCap} material={M.ceramic} position={[0.012 * side, 0.025, 0]} />
        <mesh geometry={G.upperArm} material={M.ceramic} position={[0, -0.04, 0]} />
        <group ref={elbow} position={[0, -UPPER_ARM, 0]}>
          <mesh geometry={G.joint44} material={M.graphite} />
          <mesh geometry={G.forearm} material={M.ceramic} position={[0, -0.035, 0]} />
          <mesh geometry={G.wristRing} material={M.titanium} position={[0, -FOREARM + 0.03, 0]} />
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
    );
  };

  const leg = (side: 1 | -1) => {
    const hip = side === 1 ? hipLRef : hipRRef;
    const knee = side === 1 ? kneeLRef : kneeRRef;
    const ankle = side === 1 ? ankleLRef : ankleRRef;
    return (
      <group ref={hip} position={[0.1 * side, -0.035, 0]}>
        <mesh geometry={G.joint60} material={M.graphite} />
        <mesh geometry={G.thigh} material={M.ceramic} position={[0, -0.045, 0]} />
        <group ref={knee} position={[0, -THIGH, 0]}>
          <mesh geometry={G.joint52} material={M.graphite} />
          <mesh geometry={G.kneecap} material={M.ceramic} position={[0, 0.01, 0.042]} />
          <mesh geometry={G.shin} material={M.ceramic} position={[0, -0.05, 0]} />
          <mesh geometry={G.calfRod} material={M.titanium} position={[0, -0.19, -0.045]} />
          <group ref={ankle} position={[0, -SHIN, 0]}>
            <mesh geometry={G.joint38} material={M.graphite} />
            <mesh geometry={G.foot} material={M.ceramic} position={[0, -0.04, 0.045]} />
            <mesh geometry={G.sole} material={M.rubber} position={[0, -0.073, 0.045]} />
            <mesh geometry={G.toeLight} material={M.accent} position={[0, -0.035, 0.163]} />
          </group>
        </group>
      </group>
    );
  };

  return (
    <group ref={bodyRef}>
      {/* The scan field it stands in (no pedestal). */}
      <mesh geometry={G.floor} material={glows.shadow} position={[0, 0.001, 0]} scale={1.3} renderOrder={1} />
      <mesh geometry={G.floor} material={glows.field} position={[0, 0.002, 0]} scale={2.8} renderOrder={2} />
      <mesh geometry={G.column} material={glows.column} renderOrder={3} />

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

      <group ref={pelvisRef} position={[0, HIP_Y, 0]}>
        <mesh geometry={G.pelvis} material={M.ceramic} position={[0, 0.03, 0]} />
        <mesh geometry={G.groin} material={M.graphite} position={[0, -0.02, 0.01]} />
        {leg(1)}
        {leg(-1)}

        {/* Segmented graphite spine up to the chest. */}
        {[0.1, 0.135, 0.17].map((y, i) => (
          <mesh key={y} geometry={G.spine} material={M.graphite} position={[0, y, 0]} scale={[1 - i * 0.04, 1, 0.8]} />
        ))}

        <group ref={chestRef} position={[0, 0.19, 0]}>
          <mesh geometry={G.chest} material={M.ceramic} />
          <mesh geometry={G.abPlate} material={M.ceramic} position={[0, -0.075, 0.07]} rotation={[-0.12, 0, 0]} />
          <mesh geometry={G.backpack} material={M.graphite} position={[0, 0.19, -0.1]} />
          <mesh geometry={G.toeLight} material={M.accent} position={[0.07, 0.27, -0.137]} scale={[0.6, 1, 1]} />
          {/* The aperture core. */}
          <mesh geometry={G.coreRing} material={M.titanium} position={[0, 0.19, 0.106]} />
          <mesh geometry={G.coreDisc} material={glows.core} position={[0, 0.19, 0.1085]} />
          <mesh geometry={G.plane} material={glows.coreBloom} position={[0, 0.19, 0.115]} scale={0.3} />
          <pointLight ref={coreLightRef} color="#ff5a3c" intensity={0} distance={0.9} decay={2} position={[0, 0.19, 0.2]} />

          {arm(1)}
          {arm(-1)}

          <group ref={neckRef} position={[0, 0.33, 0]}>
            <mesh geometry={G.neck} material={M.graphite} position={[0, 0.03, 0]} />
            <mesh geometry={G.neckRing} material={M.titanium} position={[0, 0.0, 0]} />
            <group ref={headRef} position={[0, 0.16, 0]}>
              <mesh geometry={G.head} material={M.ceramic} />
              <mesh geometry={G.visor} material={M.visor} />
              <mesh geometry={G.eye} material={glows.eye} renderOrder={3} />
              {[1, -1].map((side) => (
                <group key={side} position={[0.095 * side, -0.005, -0.005]}>
                  <mesh geometry={G.ear} material={M.titanium} />
                  <mesh geometry={G.earRing} material={M.accent} position={[0.018 * side, 0, 0]} />
                </group>
              ))}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
