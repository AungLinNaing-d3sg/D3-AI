"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PMREMGenerator,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type IUniform,
  type Mesh,
  type PointLight,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { journeyState } from "@/lib/motion/journeyState";
import { SCENE_TIER_CONFIG, type SceneQuality } from "@/lib/three/deviceTiers";
import { faqItems } from "@/data/faq";

interface FaqSceneProps {
  quality: SceneQuality;
}

/**
 * Chapter 08 — FAQ: the "Query Core", staged like a product shot.
 *
 * A refractive glass orb (real transmission, with a faint iridescent film)
 * floats over a polished graphite pedestal ringed with a D3-SG red light
 * line and lit by a soft upward beam. Suspended inside the orb, a sculpted
 * ceramic question mark with a glowing red point turns slowly, seen through
 * the glass. Around it, a titanium gimbal band engraved with fine ticks and
 * a second graphite ring turn like a precision instrument, and one answer
 * bead per real question (src/data/faq.ts) travels an outer orbit, each
 * drawing a fading comet trail; they brighten in turn, so the object reads
 * as questions being resolved.
 *
 * Like the Vision robot, its physical materials take reflections from a
 * studio environment map applied only to them (never `scene.environment`),
 * and everything fades on `journeyState.weight.faq` by dimming colour,
 * reflections, transmission and glow together, going idle at zero weight.
 * The low tier swaps the transmissive glass for a light, non-refractive
 * shell (no extra transmission render pass). Landscape screens place it in
 * the open space under the chapter heading; portrait screens tuck it
 * top-right, smaller and dimmer. It turns with the chapter's scroll and
 * leans towards the pointer.
 */

const TIER = {
  high: { tube: 180, radial: 28, sphere: 64, ring: 180, ticks: 72, dust: 220, glass: true },
  medium: { tube: 120, radial: 20, sphere: 48, ring: 128, ticks: 48, dust: 140, glass: true },
  low: { tube: 80, radial: 14, sphere: 32, ring: 80, ticks: 24, dust: 70, glass: false },
} as const;

const PLACEMENT = {
  landscape: { position: new Vector3(-1.78, -0.62, -0.2), scale: 0.5, light: 1, dim: 1 },
  portrait: { position: new Vector3(0.7, 1.85, -1.6), scale: 0.42, light: 0.5, dim: 0.62 },
} as const;

/** The question mark's hook, in glyph units (about 1.7 tall). */
const HOOK_POINTS = [
  [0, -0.18],
  [0, 0.04],
  [0.07, 0.2],
  [0.28, 0.36],
  [0.42, 0.58],
  [0.36, 0.84],
  [0.12, 0.98],
  [-0.16, 0.96],
  [-0.36, 0.78],
].map(([x, y]) => new Vector3(x, y, 0));
/** Rounded caps sit on both ends of the hook. */
const HOOK_ENDS = [HOOK_POINTS[0]!, HOOK_POINTS[HOOK_POINTS.length - 1]!];
const TUBE_RADIUS = 0.1;
const DOT_Y = -0.5;
const DOT_RADIUS = 0.12;
/** Recentres the glyph on its own middle. */
const GLYPH_OFFSET = new Vector3(-0.03, -0.22, 0);
const GLYPH_SCALE = 0.42;

const ORB_RADIUS = 0.9;
const PEDESTAL_Y = -1.3;
const GIMBAL_RADIUS = 1.06;
const OUTER_RING_RADIUS = 1.2;
const ORBIT_RADIUS = 1.42;
const ORBIT_TILT = [1.22, 0.18, 0.32] as const;
/** Orbit turns per second. */
const ORBIT_SPEED = 0.035;
/** Seconds each answer bead stays brightest before the next takes over. */
const BEAD_BEAT = 1.6;
const BEADS = faqItems.length;

const planeVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const haloFragment = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float core = exp(-d * d * 5.5);
    float ring = exp(-pow((d - 0.66 - 0.02 * sin(uTime * 0.8)) * 10.0, 2.0)) * 0.12;
    vec3 warm = mix(vec3(0.95, 0.29, 0.19), vec3(1.0, 0.72, 0.58), core);
    gl_FragColor = vec4(warm * (core * 0.3 + ring), 1.0) * uOpacity;
  }
`;
/** Soft contact shadow under the orb on the pedestal top. */
const shadowFragment = /* glsl */ `
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    gl_FragColor = vec4(0.0, 0.0, 0.0, smoothstep(1.0, 0.0, d) * 0.65 * uOpacity);
  }
`;
/** Upward light beam from the pedestal: bright at the base, gone by the top. */
const beamFragment = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float fade = pow(1.0 - vUv.y, 2.2);
    float edge = 0.55 + 0.45 * sin(vUv.x * 6.2832 * 3.0 + uTime * 0.6);
    gl_FragColor = vec4(vec3(1.0, 0.55, 0.42) * fade * (0.08 + 0.05 * edge), 1.0) * uOpacity;
  }
`;
/** Comet trails behind each answer bead along the orbit torus (uv.x runs
 * once around the ring, matching the beads' angle / 2π). */
const trailFragment = /* glsl */ `
  #define BEADS ${BEADS}
  uniform float uHead[BEADS];
  uniform float uGlow[BEADS];
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float light = 0.04;
    for (int i = 0; i < BEADS; i++) {
      float behind = fract(uHead[i] - vUv.x);
      light += exp(-behind * 26.0) * (0.35 + uGlow[i] * 0.9);
    }
    vec3 color = mix(vec3(0.95, 0.29, 0.19), vec3(1.0, 0.78, 0.65), clamp(light - 0.3, 0.0, 1.0));
    gl_FragColor = vec4(color * light, 1.0) * uOpacity;
  }
`;
const dustVertex = /* glsl */ `
  attribute vec3 aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vTwinkle;
  void main() {
    vec3 p = position;
    p.y += mod(uTime * (0.05 + aSeed.x * 0.08) + aSeed.y * 4.0, 4.0) - 2.0;
    p.x += sin(uTime * 0.3 + aSeed.z * 6.28) * 0.12;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.6 + aSeed.z * 2.6) * uPixelRatio * (4.0 / -mv.z);
    vTwinkle = 0.45 + 0.55 * sin(uTime * (0.8 + aSeed.x) + aSeed.y * 6.28);
  }
`;
const dustFragment = /* glsl */ `
  uniform float uOpacity;
  varying float vTwinkle;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vTwinkle * uOpacity * 0.5;
    gl_FragColor = vec4(vec3(1.0, 0.82, 0.7) * a, a);
  }
`;

/** Deterministic PRNG — the same dust on every load. */
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

export function FaqScene({ quality }: FaqSceneProps) {
  const tier = TIER[quality];
  const objectScale = SCENE_TIER_CONFIG[quality].objectScale;
  const size = useThree((state) => state.size);
  const gl = useThree((state) => state.gl);
  const portrait = size.width / Math.max(size.height, 1) < 1.05;
  const place = portrait ? PLACEMENT.portrait : PLACEMENT.landscape;

  const rootRef = useRef<Group>(null);
  const floatRef = useRef<Group>(null);
  const glyphRef = useRef<Group>(null);
  const gimbalRef = useRef<Group>(null);
  const outerRef = useRef<Group>(null);
  const haloRef = useRef<Mesh>(null);
  const beadRefs = useRef<(Mesh | null)[]>([]);
  const ticksRef = useRef<InstancedMesh>(null);
  const keyRef = useRef<PointLight>(null);
  const rimRef = useRef<PointLight>(null);
  const kickRef = useRef<PointLight>(null);
  const innerRef = useRef<PointLight>(null);
  const tilt = useRef({ x: 0, y: 0 });

  // Studio reflections for this chapter's materials only.
  const envMap = useMemo(() => {
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const texture = pmrem.fromScene(room, 0.03).texture;
    room.dispose();
    pmrem.dispose();
    return texture;
  }, [gl]);

  const materials = useMemo(() => {
    const physical = (params: ConstructorParameters<typeof MeshPhysicalMaterial>[0]) => new MeshPhysicalMaterial({ envMap, ...params });
    const additive = (fragmentShader: string, uniforms: Record<string, IUniform>, vertexShader = planeVertex) =>
      new ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false, blending: AdditiveBlending });
    const beam = additive(beamFragment, { uOpacity: { value: 0 }, uTime: { value: 0 } });
    beam.side = DoubleSide;
    return {
      glass: tier.glass
        ? physical({
            color: "#ffffff",
            roughness: 0.015,
            metalness: 0,
            transmission: 1,
            thickness: 0.7,
            ior: 1.48,
            iridescence: 0.35,
            iridescenceIOR: 1.3,
            iridescenceThicknessRange: [180, 520],
            clearcoat: 1,
            clearcoatRoughness: 0.03,
            attenuationColor: "#ffe2d6",
            attenuationDistance: 3,
            specularIntensity: 1,
            envMapIntensity: 1.3,
          })
        : physical({ color: "#cfd6e4", roughness: 0.05, metalness: 0, transparent: true, opacity: 0.16, clearcoat: 1, envMapIntensity: 1.6, depthWrite: false }),
      ceramic: physical({ color: "#efeee9", roughness: 0.24, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.05 }),
      titanium: physical({ color: "#c7cad0", roughness: 0.2, metalness: 1, envMapIntensity: 1.3 }),
      graphite: physical({ color: "#1d2027", roughness: 0.18, metalness: 1, clearcoat: 0.6, clearcoatRoughness: 0.1, envMapIntensity: 1.1 }),
      accent: new MeshStandardMaterial({ color: "#f14a30", emissive: "#e8432a", emissiveIntensity: 1.6, roughness: 0.35 }),
      ringLight: new MeshStandardMaterial({ color: "#f14a30", emissive: "#ff5a3c", emissiveIntensity: 2.2, roughness: 0.4 }),
      halo: additive(haloFragment, { uOpacity: { value: 0 }, uTime: { value: 0 } }),
      beam,
      shadow: new ShaderMaterial({
        vertexShader: planeVertex,
        fragmentShader: shadowFragment,
        uniforms: { uOpacity: { value: 0 } },
        transparent: true,
        depthWrite: false,
      }),
      trail: additive(trailFragment, {
        uHead: { value: new Array<number>(BEADS).fill(0) },
        uGlow: { value: new Array<number>(BEADS).fill(0) },
        uOpacity: { value: 0 },
      }),
      dust: additive(dustFragment, { uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 } }, dustVertex),
    };
  }, [envMap, tier.glass]);

  /** One material per answer bead, so each can brighten on its own beat. */
  const beadMaterials = useMemo(
    () =>
      faqItems.map(
        (_, i) =>
          new MeshStandardMaterial({
            color: i % 2 ? "#ffc2a3" : "#ff6a4d",
            emissive: i % 2 ? "#ffb38f" : "#f14a30",
            emissiveIntensity: 0.6,
            roughness: 0.25,
          })
      ),
    []
  );

  const geometries = useMemo(() => {
    const curve = new CatmullRomCurve3(HOOK_POINTS, false, "catmullrom", 0.5);
    const beam = new CylinderGeometry(0.62, 0.92, 2.4, 48, 1, true);
    beam.translate(0, 1.2, 0);
    return {
      hook: new TubeGeometry(curve, tier.tube, TUBE_RADIUS, tier.radial, false),
      cap: new SphereGeometry(TUBE_RADIUS, tier.radial, Math.max(8, tier.radial / 2)),
      dot: new SphereGeometry(DOT_RADIUS, 32, 16),
      orb: new SphereGeometry(ORB_RADIUS, tier.sphere, tier.sphere / 2),
      gimbal: new TorusGeometry(GIMBAL_RADIUS, 0.022, 16, tier.ring),
      outer: new TorusGeometry(OUTER_RING_RADIUS, 0.01, 10, tier.ring),
      orbit: new TorusGeometry(ORBIT_RADIUS, 0.006, 8, tier.ring * 2),
      tick: new BoxGeometry(0.008, 0.07, 0.03),
      bead: new SphereGeometry(0.04, 20, 12),
      pedestal: new CylinderGeometry(1.05, 1.12, 0.14, tier.sphere, 1),
      plinth: new CylinderGeometry(0.82, 0.86, 0.05, tier.sphere, 1),
      ringLight: new TorusGeometry(1.06, 0.012, 10, tier.ring),
      beam,
      plane: new PlaneGeometry(1, 1),
    };
  }, [tier]);

  const dust = useMemo(() => {
    const rand = mulberry32(31);
    const positions = new Float32Array(tier.dust * 3);
    const seeds = new Float32Array(tier.dust * 3);
    for (let i = 0; i < tier.dust; i += 1) {
      positions.set([(rand() - 0.5) * 4.2, (rand() - 0.5) * 3.4, (rand() - 0.5) * 2.4], i * 3);
      seeds.set([rand(), rand(), rand()], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new BufferAttribute(seeds, 3));
    return g;
  }, [tier.dust]);

  // Engraved ticks around the gimbal band (every fourth one longer).
  useEffect(() => {
    const ticks = ticksRef.current;
    if (!ticks) return;
    const dummy = new Object3D();
    for (let i = 0; i < tier.ticks; i += 1) {
      const angle = (i / tier.ticks) * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * (GIMBAL_RADIUS + 0.04), Math.sin(angle) * (GIMBAL_RADIUS + 0.04), 0);
      dummy.rotation.set(0, 0, angle - Math.PI / 2);
      dummy.scale.set(1, i % 4 === 0 ? 1.6 : 0.8, 1);
      dummy.updateMatrix();
      ticks.setMatrixAt(i, dummy.matrix);
    }
    ticks.instanceMatrix.needsUpdate = true;
  }, [tier.ticks, geometries]);

  useEffect(
    () => () => {
      Object.values(materials).forEach((m) => m.dispose());
      beadMaterials.forEach((m) => m.dispose());
      Object.values(geometries).forEach((g) => g.dispose());
      dust.dispose();
    },
    [materials, beadMaterials, geometries, dust]
  );
  useEffect(() => () => envMap.dispose(), [envMap]);

  /** Each solid material's full-strength look, to fade from. */
  const solids = useMemo(
    () =>
      [materials.ceramic, materials.titanium, materials.graphite, materials.accent, materials.ringLight, materials.glass].map((m) => ({
        m,
        color: m.color.clone(),
        env: m instanceof MeshPhysicalMaterial ? m.envMapIntensity : 0,
        emissive: m.emissiveIntensity,
        transmission: m instanceof MeshPhysicalMaterial ? m.transmission : 0,
        opacity: m.opacity,
      })),
    [materials]
  );
  const beadColors = useMemo(() => beadMaterials.map((m) => m.color.clone()), [beadMaterials]);

  useFrame((state, delta) => {
    const weight = journeyState.weight.faq;
    const root = rootRef.current;
    const active = weight > 0.001;
    if (root) root.visible = active;
    if (haloRef.current) haloRef.current.visible = active;
    const lightScale = place.light * weight;
    if (keyRef.current) keyRef.current.intensity = 24 * lightScale;
    if (rimRef.current) rimRef.current.intensity = 22 * lightScale;
    if (kickRef.current) kickRef.current.intensity = 5 * lightScale;
    if (innerRef.current) innerRef.current.intensity = 1.6 * lightScale;
    if (!active || !root) return;

    const time = state.clock.elapsedTime;
    const fade = Math.min(1, weight * 1.15);
    // Solid fade: dims into the dark (colour, reflections, transmission and
    // glow together) rather than turning transparent.
    const dimming = fade * fade * (3 - 2 * fade) * place.dim;
    const pulse = 0.85 + 0.15 * Math.sin(time * 1.6);
    solids.forEach(({ m, color, env, emissive, transmission, opacity }) => {
      m.color.copy(color).multiplyScalar(dimming);
      m.emissiveIntensity = emissive * dimming * pulse;
      if (m instanceof MeshPhysicalMaterial) {
        m.envMapIntensity = env * dimming;
        m.transmission = transmission * dimming;
      }
      if (m.transparent) m.opacity = opacity * dimming;
    });

    // Beads travel the orbit; the one on the beat is brightest.
    const lit = (time / BEAD_BEAT) % BEADS;
    const tu = materials.trail.uniforms as Record<string, IUniform>;
    const heads = tu.uHead!.value as number[];
    const glows = tu.uGlow!.value as number[];
    beadMaterials.forEach((m, i) => {
      const turn = (i / BEADS + time * ORBIT_SPEED) % 1;
      const angle = turn * Math.PI * 2;
      beadRefs.current[i]?.position.set(Math.cos(angle) * ORBIT_RADIUS, Math.sin(angle) * ORBIT_RADIUS, 0);
      const distance = Math.min(Math.abs(lit - i), BEADS - Math.abs(lit - i));
      const glow = Math.max(0, 1 - distance);
      heads[i] = turn;
      glows[i] = glow;
      m.color.copy(beadColors[i]!).multiplyScalar(dimming);
      m.emissiveIntensity = (0.5 + glow * 3) * dimming;
    });
    tu.uOpacity!.value = fade * place.dim;

    const hu = materials.halo.uniforms as Record<string, IUniform>;
    hu.uOpacity!.value = fade * place.light;
    hu.uTime!.value = time;
    const bu = materials.beam.uniforms as Record<string, IUniform>;
    bu.uOpacity!.value = fade * place.dim;
    bu.uTime!.value = time;
    (materials.shadow.uniforms as Record<string, IUniform>).uOpacity!.value = fade;
    const du = materials.dust.uniforms as Record<string, IUniform>;
    du.uTime!.value = time;
    du.uOpacity!.value = fade * place.light;
    du.uPixelRatio!.value = gl.getPixelRatio();

    // Turns with the chapter's scroll, floats, and leans towards the pointer.
    const progress = journeyState.progress.faq;
    const ease = 1 - Math.exp(-delta * 3);
    tilt.current.x += (journeyState.pointer.y * 0.12 - tilt.current.x) * ease;
    tilt.current.y += (journeyState.pointer.x * 0.25 - tilt.current.y) * ease;
    root.position.copy(place.position);
    root.rotation.set(tilt.current.x, tilt.current.y + progress * 0.5 - 0.25, 0);
    if (floatRef.current) floatRef.current.position.y = Math.sin(time * 0.7) * 0.05;
    if (glyphRef.current) glyphRef.current.rotation.y = -0.6 + progress * 1.4 + Math.sin(time * 0.35) * 0.18;
    if (gimbalRef.current) gimbalRef.current.rotation.z = time * 0.12 + progress * 0.8;
    if (outerRef.current) outerRef.current.rotation.z = -time * 0.08 - progress * 0.6;

    const s = place.scale * objectScale;
    keyRef.current?.position.set(root.position.x - 1.8 * s, root.position.y + 1.9 * s, root.position.z + 2.4);
    rimRef.current?.position.set(root.position.x + 1.9 * s, root.position.y + 1.2 * s, root.position.z - 1.6);
    kickRef.current?.position.set(root.position.x + 0.3 * s, root.position.y - 1.2 * s, root.position.z + 1.3);
    innerRef.current?.position.copy(root.position);
  });

  const scale = place.scale * objectScale;

  return (
    <>
      <pointLight ref={keyRef} color="#ffe6cc" intensity={0} distance={10} decay={2} />
      <pointLight ref={rimRef} color="#8fb4ff" intensity={0} distance={9} decay={2} />
      <pointLight ref={kickRef} color="#f14a30" intensity={0} distance={5} decay={2} />
      <pointLight ref={innerRef} color="#ff7a5c" intensity={0} distance={1.6} decay={2} />

      <mesh
        ref={haloRef}
        geometry={geometries.plane}
        material={materials.halo}
        position={[place.position.x, place.position.y, place.position.z - 1.4]}
        scale={[4.6 * scale, 4.6 * scale, 1]}
        renderOrder={-5}
        visible={false}
      />

      <group ref={rootRef} visible={false} scale={scale}>
        {/* Pedestal: polished graphite with a red light line and a soft beam. */}
        <group position={[0, PEDESTAL_Y, 0]}>
          <mesh geometry={geometries.pedestal} material={materials.graphite} />
          <mesh geometry={geometries.plinth} material={materials.titanium} position={[0, 0.09, 0]} />
          <mesh geometry={geometries.ringLight} material={materials.ringLight} position={[0, 0.072, 0]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh
            geometry={geometries.plane}
            material={materials.shadow}
            position={[0, 0.117, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[1.5, 1.5, 1]}
            renderOrder={1}
          />
          <mesh geometry={geometries.beam} material={materials.beam} position={[0, 0.12, 0]} renderOrder={2} />
        </group>

        <group ref={floatRef}>
          {/* The question mark, suspended inside the glass. */}
          <group ref={glyphRef} scale={GLYPH_SCALE}>
            <group position={GLYPH_OFFSET}>
              <mesh geometry={geometries.hook} material={materials.ceramic} />
              {HOOK_ENDS.map((end, i) => (
                <mesh key={i} geometry={geometries.cap} material={materials.ceramic} position={end} />
              ))}
              <mesh geometry={geometries.dot} material={materials.accent} position={[0, DOT_Y, 0]} />
            </group>
          </group>

          <mesh geometry={geometries.orb} material={materials.glass} renderOrder={3} />

          {/* Precision gimbal: engraved titanium band + fine graphite ring. */}
          <group rotation={[1.32, 0.08, -0.22]}>
            <group ref={gimbalRef}>
              <mesh geometry={geometries.gimbal} material={materials.titanium} />
              <instancedMesh ref={ticksRef} args={[geometries.tick, materials.titanium, tier.ticks]} />
            </group>
          </group>
          <group rotation={[0.28, 1.05, 0.1]}>
            <group ref={outerRef}>
              <mesh geometry={geometries.outer} material={materials.graphite} />
            </group>
          </group>

          {/* Answer orbit with comet trails. */}
          <group rotation={[...ORBIT_TILT]}>
            <mesh geometry={geometries.orbit} material={materials.trail} renderOrder={4} />
            {beadMaterials.map((m, i) => (
              <mesh
                key={i}
                geometry={geometries.bead}
                material={m}
                ref={(node) => {
                  beadRefs.current[i] = node;
                }}
              />
            ))}
          </group>
        </group>

        <points geometry={dust} material={materials.dust} frustumCulled={false} />
      </group>
    </>
  );
}
