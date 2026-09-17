"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { FontLoader, type Font } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  DoubleSide,
  type BufferAttribute,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshPhysicalMaterial,
  type Texture,
} from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { damp } from "@/lib/motion/mathUtils";
import { siteConfig } from "@/data/site";
import { SCENE_TIER_CONFIG, tieredParticleCount, type SceneQuality } from "@/lib/three/deviceTiers";

interface CtaSceneProps {
  quality: SceneQuality;
}

/** Real 3D letterforms (bundled with `three` itself — `examples/fonts`,
 * copied to `public/fonts/` at build time, no CDN fetch) rather than a
 * canvas-rasterised approximation, so the company name reads as an actual
 * extruded, bevelled object with correct letter curves. */
const FONT_URL = "/fonts/helvetiker_bold.typeface.json";
const TEXT_SIZE = 0.4;
const TEXT_DEPTH = 0.14;

/** The same warm brand accent the wordmark's own emissive already uses, plus
 * one cool cyan tint (the site's established secondary accent — see
 * `DISCIPLINE_ACCENTS` in TypographyScene.tsx) so the holographic dressing
 * around the wordmark reads as the same two-tone system as the rest of the
 * site, not a new palette. */
const GLOW_ACCENT = "#f14a30";
const WAVE_ACCENT_A = "#f14a30";
const WAVE_ACCENT_B = "#00d2ff";

/** A soft, blurred dark ellipse rendered as a canvas texture — the "contact
 * shadow" the wordmark casts onto an implied floor, without the cost/risk
 * of enabling real-time shadow mapping on the shared, always-mounted
 * `<Canvas>` every other chapter's scene also renders into. */
let sharedContactShadowTexture: Texture | null = null;
function getContactShadowTexture(): Texture | undefined {
  if (typeof document === "undefined") return undefined;
  if (sharedContactShadowTexture) return sharedContactShadowTexture;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(0,0,0,0.55)");
  gradient.addColorStop(0.6, "rgba(0,0,0,0.22)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  sharedContactShadowTexture = texture;
  return texture;
}

/** A soft horizontal band — bright in the middle, fully transparent at the
 * top/bottom edges — used as the "scanning" light sweep's texture (see the
 * `scanRef` plane below). A canvas gradient again rather than a shader, so
 * it's just one more draw call on the existing additive-particle recipe
 * already established in this file/`ParticleSystem.tsx`. */
let sharedScanTexture: Texture | null = null;
function getScanTexture(): Texture | undefined {
  if (typeof document === "undefined") return undefined;
  if (sharedScanTexture) return sharedScanTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.9)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  sharedScanTexture = texture;
  return texture;
}

/** Rare, brief, low-amplitude dip standing in for "digital distortion" — a
 * restrained signal-flicker rather than any geometric glitch/RGB-split
 * (which would read as gamey and risks readability), applied directly
 * (unsmoothed) on top of the wordmark's already-damped emissive/opacity
 * breathing so the dip itself still reads as a quick flicker, not a slow
 * fade. Mostly returns 0 — only non-zero for ~4% of a ~6.3s cycle. */
function flickerDip(elapsedSeconds: number): number {
  const cycle = 6.3;
  const phase = (elapsedSeconds % cycle) / cycle;
  if (phase > 0.045) return 0;
  return Math.sin((phase / 0.045) * Math.PI) * 0.07;
}

/**
 * Chapter 08 — Final CTA. The journey's closing image: the real company
 * wordmark, "D3-SG", as one physical, bevelled, extruded 3D object — not a
 * flat logo render — reflecting the same premium AI-product register as
 * every scene before it, replacing the previous generic distorted-blob
 * glow. Real letterforms come from a bundled typeface (`FONT_URL`, loaded
 * once via `FontLoader`); a soft contact shadow beneath it and a restrained
 * halo of ambient "data" motes around it (never directly in front of/behind
 * the readable face) give it depth without competing with the DOM CTA copy
 * layered above (see components/sections/CtaSection.tsx). Slow continuous
 * rotation plus damped pointer parallax keep it alive without ever feeling
 * like a spinning-logo cliché.
 *
 * A restrained set of "virtual/holographic" touches sit around the wordmark
 * on top of that base: a rim-light glow shell (a slightly larger, back-face,
 * additive duplicate of the same geometry — the established no-postprocessing
 * "fake glow" recipe already used site-wide, see CLAUDE.md/plan notes on
 * there being no bloom pipeline), a dim mirrored "floor reflection" of the
 * same geometry, two slow concentric energy-wave rings, an occasional soft
 * scanning light sweep, and a rare, brief emissive flicker
 * (`flickerDip`) standing in for digital distortion. All of it is gated
 * behind `weight`/`quality` and stays well below the wordmark's own opacity
 * so "D3-SG" itself is always the clear focal point — never competing effects.
 */
export function CtaScene({ quality }: CtaSceneProps) {
  const groupRef = useRef<Group>(null);
  const wordmarkRef = useRef<Mesh>(null);
  const shadowRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);
  const reflectionRef = useRef<Mesh>(null);
  const scanRef = useRef<Mesh>(null);
  const ring1Ref = useRef<Mesh>(null);
  const ring2Ref = useRef<Mesh>(null);
  const dustHandle = useRef<ParticleSystemHandle>(null);
  const dustInitialized = useRef(false);
  const tilt = useRef({ x: 0, y: 0 });
  const fitScale = useRef(1);
  const showExtras = quality !== "low";

  const [font, setFont] = useState<Font | null>(null);
  const objectScale = SCENE_TIER_CONFIG[quality].objectScale;
  const dustCount = tieredParticleCount(140, quality);
  const bevelSegments = quality === "high" ? 4 : 2;
  const curveSegments = quality === "high" ? 10 : 6;

  useEffect(() => {
    let cancelled = false;
    // A missing/failed font asset (a 404, an offline load, or — as jsdom's
    // test environment surfaces — a runtime with no global `fetch`/`Request`
    // at all) is a recoverable condition: the CTA's real content
    // (components/sections/CtaSection.tsx) never depends on this purely
    // decorative wordmark, so this chapter simply renders without it (see
    // the `!font` early return below). `FileLoader` (which `FontLoader`
    // delegates to) can throw synchronously the moment it touches `fetch`
    // in an environment missing it, before its own async error callback
    // ever runs — the try/catch is what actually stops that from crashing
    // the component, not the `onError` callback alone.
    try {
      const loader = new FontLoader();
      loader.load(
        FONT_URL,
        (loadedFont) => {
          if (!cancelled) setFont(loadedFont);
        },
        undefined,
        () => undefined
      );
    } catch {
      // Leave `font` as `null` — see the comment above.
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const geometry = useMemo(() => {
    if (!font) return null;
    const geom = new TextGeometry(siteConfig.name, {
      font,
      size: TEXT_SIZE,
      depth: TEXT_DEPTH,
      curveSegments,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.028,
      bevelOffset: 0,
      bevelSegments,
    });
    geom.center();
    return geom;
  }, [font, curveSegments, bevelSegments]);

  const contactShadowTexture = useMemo(() => getContactShadowTexture(), []);
  const scanTexture = useMemo(() => getScanTexture(), []);

  /** Real bounds once the font resolves; sensible defaults otherwise (the
   * extras this feeds are all gated on `geometry` existing anyway). */
  const textBounds = useMemo(() => {
    if (!geometry) return { width: 1.8, height: 0.5 };
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box) return { width: 1.8, height: 0.5 };
    return { width: box.max.x - box.min.x, height: box.max.y - box.min.y };
  }, [geometry]);

  useFrame((state, delta) => {
    const weight = journeyState.weight.cta;
    const group = groupRef.current;
    if (group) group.visible = weight > 0.001;

    const pointer = journeyState.pointer;
    tilt.current.x = damp(tilt.current.x, pointer.y * 0.08, 3, delta);
    tilt.current.y = damp(tilt.current.y, pointer.x * 0.12, 3, delta);

    // Portrait phones' narrower horizontal FOV can clip the wordmark's
    // edges even after `objectScale` — only below the desktop tier, keep
    // re-fitting to whatever width is actually visible right now.
    let targetFit = objectScale;
    if (quality !== "high" && geometry) {
      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      const worldWidth = box ? (box.max.x - box.min.x) * 1.35 : 3.2;
      const viewport = state.viewport.getCurrentViewport(state.camera, [0, 0, 0], state.size);
      targetFit = Math.min(objectScale, (viewport.width * 0.9) / worldWidth);
    }
    fitScale.current = damp(fitScale.current, Math.max(targetFit, 0.001), 4, delta);
    if (group) group.scale.setScalar(fitScale.current);

    const flicker = flickerDip(state.clock.elapsedTime);

    if (wordmarkRef.current) {
      wordmarkRef.current.rotation.x = tilt.current.x;
      wordmarkRef.current.rotation.y = tilt.current.y + Math.sin(state.clock.elapsedTime * 0.12) * 0.09;
      const material = wordmarkRef.current.material as MeshPhysicalMaterial;
      material.opacity = damp(material.opacity, 0.95 * weight, 4, delta) - flicker;
      material.emissiveIntensity =
        damp(material.emissiveIntensity, 0.32 + Math.sin(state.clock.elapsedTime * 0.5) * 0.06, 4, delta) - flicker * 1.5;
    }

    if (shadowRef.current) {
      const material = shadowRef.current.material as MeshBasicMaterial;
      material.opacity = damp(material.opacity, 0.6 * weight, 4, delta);
    }

    if (showExtras && wordmarkRef.current) {
      // Rim-glow shell: same rotation as the wordmark, a hair larger, back
      // faces only (so it only shows past the letterforms' silhouette) and
      // additive so it reads as a soft halo rather than a solid duplicate.
      if (glowRef.current) {
        glowRef.current.rotation.copy(wordmarkRef.current.rotation);
        const material = glowRef.current.material as MeshBasicMaterial;
        material.opacity = damp(
          material.opacity,
          (0.16 + Math.sin(state.clock.elapsedTime * 0.4) * 0.05) * weight - flicker,
          4,
          delta
        );
      }

      // Dim mirrored "floor reflection" of the wordmark, same rotation.
      if (reflectionRef.current) {
        reflectionRef.current.rotation.copy(wordmarkRef.current.rotation);
        const material = reflectionRef.current.material as MeshPhysicalMaterial;
        material.opacity = damp(material.opacity, 0.14 * weight, 4, delta);
      }

      // Two staggered concentric energy-wave rings, expanding + fading on a
      // slow loop — restrained "energy" rather than a radar-style repeat.
      const ringPeriod = 4.8;
      const baseRadius = Math.max(textBounds.width, 0.6) * 0.62;
      const spread = Math.max(textBounds.width, 0.6) * 0.5;
      if (ring1Ref.current) {
        const p = (state.clock.elapsedTime % ringPeriod) / ringPeriod;
        ring1Ref.current.scale.setScalar(baseRadius + p * spread);
        const material = ring1Ref.current.material as MeshBasicMaterial;
        material.opacity = Math.sin(p * Math.PI) * 0.22 * weight;
      }
      if (ring2Ref.current) {
        const p = ((state.clock.elapsedTime + ringPeriod / 2) % ringPeriod) / ringPeriod;
        ring2Ref.current.scale.setScalar(baseRadius + p * spread);
        const material = ring2Ref.current.material as MeshBasicMaterial;
        material.opacity = Math.sin(p * Math.PI) * 0.18 * weight;
      }

      // Occasional soft scanning sweep through the wordmark's height, then a
      // long pause — a graceful once-in-a-while pass rather than a
      // continuously running HUD scanline.
      if (scanRef.current) {
        const scanPeriod = 5.5;
        const sweepPortion = 0.4;
        const t = (state.clock.elapsedTime % scanPeriod) / scanPeriod;
        const halfHeight = Math.max(textBounds.height, 0.3) * 0.75;
        const material = scanRef.current.material as MeshBasicMaterial;
        if (t < sweepPortion) {
          const local = t / sweepPortion;
          scanRef.current.position.y = -halfHeight + local * halfHeight * 2;
          material.opacity = Math.sin(local * Math.PI) * 0.32 * weight;
        } else {
          material.opacity = 0;
        }
      }
    }

    if (!dustInitialized.current) {
      const positions = dustHandle.current?.positions;
      if (positions) {
        const pointCount = positions.length / 3;
        for (let i = 0; i < pointCount; i += 1) {
          // A loose halo well outside the wordmark's own volume, not a
          // cloud directly in front of/behind the readable text.
          const radius = 0.85 + Math.random() * 0.55;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
          positions[i * 3 + 2] = radius * Math.cos(phi) * 0.7 - 0.4;
        }
        const attribute = dustHandle.current?.points?.geometry.attributes.position as
          | BufferAttribute
          | undefined;
        if (attribute) attribute.needsUpdate = true;
        dustInitialized.current = true;
      }
    }
    const dustMaterial = dustHandle.current?.material;
    if (dustMaterial) dustMaterial.opacity = damp(dustMaterial.opacity, 0.28 * weight, 4, delta);
  });

  return (
    <group ref={groupRef} scale={objectScale}>
      <mesh ref={shadowRef} position={[0, -0.32, -0.11]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.3, 0.62]} />
        <meshBasicMaterial
          map={contactShadowTexture}
          transparent
          opacity={0}
          depthWrite={false}
          color="#000000"
        />
      </mesh>

      {geometry ? (
        <mesh ref={wordmarkRef} geometry={geometry}>
          <meshPhysicalMaterial
            transparent
            opacity={0}
            color="#e5e9f2"
            emissive="#f14a30"
            emissiveIntensity={0.32}
            roughness={0.22}
            metalness={0.55}
            clearcoat={1}
            clearcoatRoughness={0.15}
          />
        </mesh>
      ) : null}

      {geometry && showExtras ? (
        <>
          {/* Rim-glow shell — back faces of a slightly enlarged duplicate,
              additive-blended, no bloom pass required. */}
          <mesh ref={glowRef} geometry={geometry} scale={1.05} renderOrder={-1}>
            <meshBasicMaterial
              color={GLOW_ACCENT}
              transparent
              opacity={0}
              side={BackSide}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Dim mirrored floor reflection, offset just below the wordmark. */}
          <mesh
            ref={reflectionRef}
            geometry={geometry}
            position={[0, -textBounds.height - 0.16, -0.05]}
            scale={[1, -1, 1]}
          >
            <meshPhysicalMaterial
              transparent
              opacity={0}
              color="#e5e9f2"
              roughness={0.6}
              metalness={0.2}
              depthWrite={false}
            />
          </mesh>

          {/* Two staggered concentric energy-wave rings. */}
          <mesh ref={ring1Ref} position={[0, 0, -0.2]}>
            <ringGeometry args={[1, 1.035, 64]} />
            <meshBasicMaterial
              color={WAVE_ACCENT_A}
              transparent
              opacity={0}
              side={DoubleSide}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh ref={ring2Ref} position={[0, 0, -0.22]}>
            <ringGeometry args={[1, 1.035, 64]} />
            <meshBasicMaterial
              color={WAVE_ACCENT_B}
              transparent
              opacity={0}
              side={DoubleSide}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Occasional soft scanning sweep. */}
          <mesh ref={scanRef} position={[0, 0, 0.09]}>
            <planeGeometry args={[textBounds.width * 1.25, Math.max(textBounds.height, 0.3) * 0.5]} />
            <meshBasicMaterial
              map={scanTexture}
              color={GLOW_ACCENT}
              transparent
              opacity={0}
              side={DoubleSide}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </>
      ) : null}

      <ParticleSystem ref={dustHandle} count={dustCount} size={0.024} color="#ffe0db" opacity={0} additive />
    </group>
  );
}
