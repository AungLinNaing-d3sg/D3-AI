"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PMREMGenerator,
  ShaderMaterial,
  Vector2,
  Vector3,
  type IUniform,
  type Mesh,
  type PointLight,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { journeyState } from "@/lib/motion/journeyState";
import type { SceneQuality } from "@/lib/three/deviceTiers";
import { backdropFragment, dustFragment, dustVertex, planeVertex } from "@/components/three/scenes/vision/visionShaders";
import { VisionRobot } from "@/components/three/scenes/vision/VisionRobot";

interface FutureSceneProps {
  quality: SceneQuality;
}

/**
 * Chapter 07 — Our vision, embodied: the D3-SG Vision Unit, a full
 * humanoid robot (vision/VisionRobot.tsx) standing in a projected scan
 * field in a dark studio, in the open right-hand column beside the
 * chapter's module console.
 *
 * The robot is built from sculpted ceramic armour over graphite joints and
 * titanium actuators, with a glass visor, a glowing aperture core in its
 * chest and a hologram of the three disciplines floating above its raised
 * palm. Its physical materials take reflections from a studio environment
 * map applied only to them (never `scene.environment`, so no other chapter
 * changes), lit by this chapter's warm key, cool rim, red kicker and a soft
 * fill. It breathes and shifts its weight; its head follows the cursor
 * gently, and scans slowly when left alone.
 *
 * Behind it, the studio backdrop (vision/visionShaders.ts) carries a warm
 * light, a faint dot lattice and sonar rings pulsing out from the robot's
 * chest; dust drifts through the key light. Everything fades on
 * `journeyState.weight.future` — the robot's solid parts dim into the dark
 * studio (colour, reflections and glow together) instead of turning
 * transparent, so they never sort badly or dither mid-fade — and goes idle
 * at zero weight. Portrait
 * screens place the robot lower and dimmer so the copy stays readable.
 * Quality tiers scale geometry detail and dust; reduced motion / no WebGL
 * never mount the shared canvas (FutureSection shows a still fallback).
 */

const TIER = {
  high: { seg: 64, dust: 520, sonar: 1 },
  medium: { seg: 44, dust: 320, sonar: 1 },
  low: { seg: 28, dust: 160, sonar: 0.6 },
} as const;

/** Robot placement: feet position, scale (metres → scene units) and yaw. */
const PLACEMENT = {
  landscape: { position: new Vector3(2.6, -2.25, -2.6), scale: 2.35, yaw: -0.34 },
  portrait: { position: new Vector3(0.95, -3.1, -3.8), scale: 2.1, yaw: -0.28 },
} as const;
/** Chest height on the robot (metres). */
const CHEST_Y = 1.36;

const BACKDROP_SIZE = new Vector2(40, 24);
const BACKDROP_Z = -9;

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

export function FutureScene({ quality }: FutureSceneProps) {
  const tier = TIER[quality];
  const size = useThree((state) => state.size);
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const portrait = size.width / Math.max(size.height, 1) < 1.05;
  const place = portrait ? PLACEMENT.portrait : PLACEMENT.landscape;

  const rootRef = useRef<Group>(null);
  const backdropRef = useRef<Mesh>(null);
  const keyRef = useRef<PointLight>(null);
  const rimRef = useRef<PointLight>(null);
  const kickRef = useRef<PointLight>(null);
  const fillRef = useRef<PointLight>(null);

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
    return {
      ceramic: physical({ color: "#eeede8", roughness: 0.28, metalness: 0, clearcoat: 0.9, clearcoatRoughness: 0.08, envMapIntensity: 0.95 }),
      graphite: physical({ color: "#23262d", roughness: 0.32, metalness: 1, envMapIntensity: 1.1 }),
      titanium: physical({ color: "#c3c6cc", roughness: 0.2, metalness: 1, envMapIntensity: 1.2 }),
      rubber: physical({ color: "#0c0d10", roughness: 0.85, metalness: 0, envMapIntensity: 0.2 }),
      visor: physical({ color: "#06080d", roughness: 0.04, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.9 }),
      accent: new MeshStandardMaterial({ color: "#f14a30", emissive: "#f14a30", emissiveIntensity: 2.4, roughness: 0.4 }),
      backdrop: new ShaderMaterial({
        vertexShader: planeVertex,
        fragmentShader: backdropFragment,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0 },
          uEye: { value: new Vector2() },
          uSize: { value: BACKDROP_SIZE },
          uSonar: { value: tier.sonar },
        },
        transparent: true,
        depthWrite: false,
      }),
      dust: new ShaderMaterial({
        vertexShader: dustVertex,
        fragmentShader: dustFragment,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 }, uEye: { value: new Vector3() } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    };
  }, [envMap, tier.sonar]);

  const plane = useMemo(() => new PlaneGeometry(1, 1), []);

  /** Each solid material's full-strength look, to fade from. */
  const solids = useMemo(
    () =>
      [materials.ceramic, materials.graphite, materials.titanium, materials.rubber, materials.visor, materials.accent].map((m) => ({
        m,
        color: m.color.clone(),
        env: m.envMapIntensity,
        emissive: m.emissiveIntensity,
      })),
    [materials]
  );

  const dust = useMemo(() => {
    const rand = mulberry32(17);
    const positions = new Float32Array(tier.dust * 3);
    const seeds = new Float32Array(tier.dust * 3);
    for (let i = 0; i < tier.dust; i += 1) {
      positions.set([(rand() - 0.5) * 13, (rand() - 0.5) * 6, -5 + rand() * 8], i * 3);
      seeds.set([rand(), rand(), rand()], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new BufferAttribute(seeds, 3));
    return g;
  }, [tier.dust]);

  useEffect(
    () => () => {
      Object.values(materials).forEach((m) => m.dispose());
      plane.dispose();
      dust.dispose();
    },
    [materials, plane, dust]
  );
  useEffect(() => () => envMap.dispose(), [envMap]);

  const chest = useMemo(() => new Vector3(), []);

  useFrame((state) => {
    const weight = journeyState.weight.future;
    const root = rootRef.current;
    const active = weight > 0.001;
    if (root) root.visible = active;
    if (backdropRef.current) backdropRef.current.visible = active;
    const lightScale = (portrait ? 0.42 : 1) * weight;
    if (keyRef.current) keyRef.current.intensity = 60 * lightScale;
    if (rimRef.current) rimRef.current.intensity = 48 * lightScale;
    if (kickRef.current) kickRef.current.intensity = 12 * lightScale;
    if (fillRef.current) fillRef.current.intensity = 14 * lightScale;
    if (!active) return;

    const time = state.clock.elapsedTime;
    const fade = Math.min(1, weight * 1.15);
    // Solid fade: the robot dims into the dark studio (colour, reflections
    // and glow together) rather than turning transparent or dithered.
    const dimming = fade * fade * (3 - 2 * fade);
    solids.forEach(({ m, color, env, emissive }) => {
      m.color.copy(color).multiplyScalar(dimming);
      m.envMapIntensity = env * dimming;
      m.emissiveIntensity = emissive * dimming;
    });
    const bu = materials.backdrop.uniforms as Record<string, IUniform>;
    bu.uTime!.value = time;
    bu.uOpacity!.value = fade;
    const du = materials.dust.uniforms as Record<string, IUniform>;
    du.uTime!.value = time;
    du.uOpacity!.value = fade;
    du.uPixelRatio!.value = gl.getPixelRatio();

    chest.set(place.position.x, place.position.y + CHEST_Y * place.scale, place.position.z);
    (du.uEye!.value as Vector3).copy(chest);

    // Lights: a warm key drifting slowly so highlights glide over the armour.
    const s = place.scale;
    keyRef.current?.position.set(chest.x - 2.4 + Math.sin(time * 0.12) * 0.6, chest.y + 2.2, chest.z + 3);
    rimRef.current?.position.set(chest.x + 2.1, chest.y + 1.3, chest.z - 2.4);
    kickRef.current?.position.set(chest.x + 0.5, place.position.y + 0.4 * s, chest.z + 1.6);
    fillRef.current?.position.set(chest.x - 1.2, chest.y - 1.4 * s, chest.z + 2.2);

    // The backdrop's light, lattice and sonar sit behind the chest as seen from the camera.
    const cam = camera.position;
    const k = (BACKDROP_Z - cam.z) / (chest.z - cam.z);
    (bu.uEye!.value as Vector2).set(cam.x + (chest.x - cam.x) * k, cam.y + (chest.y - cam.y) * k - 0.5);
  });

  return (
    <>
      {/* Studio backdrop: always fills the frame behind the robot. */}
      <mesh
        ref={backdropRef}
        geometry={plane}
        material={materials.backdrop}
        position={[0, 0.5, BACKDROP_Z]}
        scale={[BACKDROP_SIZE.x, BACKDROP_SIZE.y, 1]}
        renderOrder={-10}
        visible={false}
      />
      <group ref={rootRef} visible={false}>
        <pointLight ref={keyRef} color="#ffe6cc" intensity={0} distance={16} decay={2} />
        <pointLight ref={rimRef} color="#8fb4ff" intensity={0} distance={14} decay={2} />
        <pointLight ref={kickRef} color="#f14a30" intensity={0} distance={7} decay={2} />
        <pointLight ref={fillRef} color="#c9d6ff" intensity={0} distance={9} decay={2} />

        <group position={place.position} scale={place.scale} rotation={[0, place.yaw, 0]}>
          <VisionRobot materials={materials} segments={tier.seg} dim={portrait} facing={place.yaw} />
        </group>

        <points geometry={dust} material={materials.dust} frustumCulled={false} />
      </group>
    </>
  );
}
