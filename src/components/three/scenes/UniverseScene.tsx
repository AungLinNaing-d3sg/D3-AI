"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, SRGBColorSpace } from "three";
import type { BufferAttribute, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PointLight } from "three";
import { ParticleSystem, type ParticleSystemHandle } from "@/components/three/primitives/ParticleSystem";
import { journeyState } from "@/lib/motion/journeyState";
import { clamp, damp } from "@/lib/motion/mathUtils";
import { universeStatRanges, universeStations } from "@/data/journey";
import { SCENE_TIER_CONFIG, tieredParticleCount, type SceneQuality } from "@/lib/three/deviceTiers";

interface UniverseSceneProps {
  quality: SceneQuality;
}

/** Canvas-texture terminal "screen" resolution — reduced on the lowest tier
 * to cut fill-rate/upload cost, not just redraw frequency (see
 * `redrawInterval` in `useFrame` below). */
const TEXTURE_SIZE: Record<SceneQuality, [number, number]> = {
  high: [512, 320],
  medium: [448, 280],
  low: [384, 240],
};

const MAX_VISIBLE_LINES = 7;
const CHARS_PER_SECOND = 26;
const CURSOR_BLINK_SECONDS = 0.5;

/** Generic "someone is actively coding" atmosphere lines — never a stand-in
 * for a real product claim (those come from `buildScriptLines` below,
 * sourced from the real statistics). */
const FILLER_LINES = [
  "> initialising analysis pipeline...",
  "const signal = filterNoise(stream);",
  "await model.train(signal);",
  'deploy(system, { region: "ap-southeast-1" });',
  "> build complete — 0 errors",
];

/**
 * One real, sourced line per statistic (src/data/journey.ts
 * `universeStations`, itself from src/data/pillars.ts), interleaved with the
 * generic filler above — the terminal always eventually "types" the
 * company's own real proof points, never invented figures. Returns both the
 * ordered script and a lookup from each statistic's index to its line's
 * position in that script, so the scroll-driven "jump to this stat's line"
 * behaviour in `useFrame` doesn't need to duplicate this interleaving logic.
 */
function buildScript(): { lines: string[]; statLineIndex: number[] } {
  const lines: string[] = [];
  const statLineIndex: number[] = [];
  universeStations.forEach((station, index) => {
    lines.push(FILLER_LINES[index % FILLER_LINES.length] ?? "");
    statLineIndex.push(lines.length);
    lines.push(`// ${station.stat.label}: ${station.stat.token}`);
  });
  return { lines, statLineIndex };
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

function drawTerminal(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  history: string[],
  current: string,
  showCursor: boolean
) {
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#070a12";
  ctx.fillRect(0, 0, width, height);

  // Title bar — the one literal "terminal window" cue.
  ctx.fillStyle = "#11161f";
  ctx.fillRect(0, 0, width, 28);
  const dotColors = ["#f14a30", "#fbbf24", "#34d399"];
  dotColors.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(16 + i * 18, 14, 5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#5b6b8c";
  ctx.font = "12px 'Courier New', monospace";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("d3sg — zsh", width / 2, 14);
  ctx.textAlign = "left";

  ctx.font = "14px 'Courier New', monospace";
  ctx.textBaseline = "top";
  const lineHeight = Math.round(height / 15);
  const startY = 40;
  const visible = [...history, current].slice(-MAX_VISIBLE_LINES);
  const maxWidth = width - 28;

  visible.forEach((line, i) => {
    const y = startY + i * lineHeight;
    if (y > height - lineHeight) return;
    ctx.fillStyle = line.startsWith("//") ? "#fd6a50" : line.startsWith(">") ? "#67e8f9" : "#d7e0f0";
    const truncated = truncateToWidth(ctx, line, maxWidth);
    ctx.fillText(truncated, 14, y);
    if (i === visible.length - 1 && showCursor) {
      const measured = ctx.measureText(truncated).width;
      ctx.fillStyle = "#fd6a50";
      ctx.fillRect(14 + measured + 2, y + 2, 8, 14);
    }
  });
}

/**
 * Chapter 05 — Data Universe ("By the numbers"). Replaces the previous
 * per-statistic particle-formation dolly with a single, persistent scene: a
 * floating terminal screen — a live `CanvasTexture` "typing" a short,
 * looping script that always eventually types each real statistic's own
 * label/token (never invented copy), a soft-glowing bezel, a desk surface
 * with a faint reflection of the screen's glow, and an abstracted, unlit
 * coder silhouette seated at it — reading as "someone is actively building
 * this" rather than an abstract particle field. Small drifting particles
 * and floating geometric "code block" accents keep the space alive. Scroll
 * position still drives which statistic's line the terminal jumps to type
 * next (see the `activeStatIndex` tracking in `useFrame`), and the shared
 * global camera (lib/motion/scrollTimeline.ts) still dollies past the whole
 * composition exactly as it does for every other chapter — this scene's
 * content does not move independently of that. The always-visible,
 * accessible statistic cards in components/sections/UniverseSection.tsx
 * remain the primary, dominant information layer; everything here sits
 * behind them on the shared fixed background canvas and is purely
 * decorative/`aria-hidden`.
 */
export function UniverseScene({ quality }: UniverseSceneProps) {
  const groupRef = useRef<Group>(null);
  const screenRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);
  const reflectionRef = useRef<Mesh>(null);
  const deskRef = useRef<Mesh>(null);
  const silhouetteHeadRef = useRef<Mesh>(null);
  const silhouetteBodyRef = useRef<Mesh>(null);
  const screenLightRef = useRef<PointLight>(null);
  const blockRefs = useRef<Mesh[]>([]);
  const dustHandle = useRef<ParticleSystemHandle>(null);
  const dustInitialized = useRef(false);
  const tilt = useRef({ x: 0, y: 0 });

  const objectScale = SCENE_TIER_CONFIG[quality].objectScale;
  const dustCount = tieredParticleCount(260, quality);
  const blockCount = quality === "low" ? 2 : quality === "medium" ? 3 : 4;
  /** Lower tiers redraw the terminal's canvas texture less often — the
   * typewriter/cursor state still advances every frame (cheap), only the
   * actual `CanvasTexture` repaint (the expensive part) is throttled. */
  const redrawInterval = quality === "low" ? 1 / 8 : quality === "medium" ? 1 / 11 : 1 / 14;

  const { lines: scriptLines, statLineIndex } = useMemo(() => buildScript(), []);
  const [textureWidth, textureHeight] = TEXTURE_SIZE[quality];

  const canvas = useMemo(() => {
    const el = document.createElement("canvas");
    el.width = textureWidth;
    el.height = textureHeight;
    return el;
  }, [textureWidth, textureHeight]);

  const ctx = useMemo(() => canvas.getContext("2d"), [canvas]);

  const texture = useMemo(() => {
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, [canvas]);

  const typed = useRef({ lineIndex: 0, charIndex: 0, timer: 0, history: [] as string[] });
  const cursor = useRef({ blinkTimer: 0, visible: true });
  const redrawTimer = useRef(0);
  const lastActiveStat = useRef(-1);

  const blockLayouts = useMemo(
    () =>
      Array.from({ length: blockCount }, (_, i) => ({
        radius: 1.6 + (i % 2) * 0.4,
        height: 0.3 + i * 0.18,
        speed: 0.12 + i * 0.04,
        phase: (i / blockCount) * Math.PI * 2,
      })),
    [blockCount]
  );

  useFrame((state, delta) => {
    const weight = journeyState.weight.universe;
    const progress = clamp(journeyState.progress.universe);
    const time = state.clock.elapsedTime;
    const group = groupRef.current;

    if (group) {
      group.visible = weight > 0.001;
      const pointer = journeyState.pointer;
      tilt.current.x = damp(tilt.current.x, pointer.y * 0.05, 3, delta);
      tilt.current.y = damp(tilt.current.y, pointer.x * 0.08, 3, delta);
      group.rotation.x = tilt.current.x;
      group.rotation.y = tilt.current.y;
    }

    // Jump the typewriter to the statistic currently centred in the scroll
    // range the instant it becomes active — the one explicit "scroll
    // position drives the coding animation" moment, layered on top of the
    // otherwise-autonomous looping script so the terminal never looks idle
    // between jumps either.
    const activeIndex = universeStatRanges.findIndex((range) => progress >= range.start && progress < range.end);
    if (activeIndex !== -1 && activeIndex !== lastActiveStat.current) {
      lastActiveStat.current = activeIndex;
      const targetLine = statLineIndex[activeIndex];
      if (targetLine !== undefined) {
        typed.current.lineIndex = targetLine;
        typed.current.charIndex = 0;
        typed.current.timer = 0;
      }
    }

    const charInterval = 1 / CHARS_PER_SECOND;
    typed.current.timer += delta;
    while (typed.current.timer >= charInterval) {
      typed.current.timer -= charInterval;
      const fullLine = scriptLines[typed.current.lineIndex] ?? "";
      if (typed.current.charIndex < fullLine.length) {
        typed.current.charIndex += 1;
      } else {
        typed.current.history.push(fullLine);
        if (typed.current.history.length > MAX_VISIBLE_LINES) typed.current.history.shift();
        typed.current.lineIndex = (typed.current.lineIndex + 1) % scriptLines.length;
        typed.current.charIndex = 0;
      }
    }

    cursor.current.blinkTimer += delta;
    if (cursor.current.blinkTimer >= CURSOR_BLINK_SECONDS) {
      cursor.current.blinkTimer -= CURSOR_BLINK_SECONDS;
      cursor.current.visible = !cursor.current.visible;
    }

    redrawTimer.current += delta;
    if (weight > 0.001 && ctx && redrawTimer.current >= redrawInterval) {
      redrawTimer.current = 0;
      const fullLine = scriptLines[typed.current.lineIndex] ?? "";
      const currentTyped = fullLine.slice(0, typed.current.charIndex);
      drawTerminal(ctx, textureWidth, textureHeight, typed.current.history, currentTyped, cursor.current.visible);
      texture.needsUpdate = true;
    }

    const glowPulse = 0.75 + Math.sin(time * 0.6) * 0.08;

    if (screenRef.current) {
      const material = screenRef.current.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, weight, 4, delta);
      material.emissiveIntensity = damp(material.emissiveIntensity, glowPulse * weight, 4, delta);
    }

    if (glowRef.current) {
      const material = glowRef.current.material as MeshBasicMaterial;
      material.opacity = damp(material.opacity, 0.22 * glowPulse * weight, 4, delta);
    }

    if (reflectionRef.current) {
      const material = reflectionRef.current.material as MeshBasicMaterial;
      material.opacity = damp(material.opacity, 0.1 * glowPulse * weight, 4, delta);
    }

    if (deskRef.current) {
      const material = deskRef.current.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, 0.6 * weight, 4, delta);
    }

    if (silhouetteHeadRef.current) {
      const material = silhouetteHeadRef.current.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, 0.9 * weight, 4, delta);
    }
    if (silhouetteBodyRef.current) {
      const material = silhouetteBodyRef.current.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, 0.9 * weight, 4, delta);
    }

    if (screenLightRef.current) {
      screenLightRef.current.intensity = damp(screenLightRef.current.intensity, 1.1 * glowPulse * weight, 4, delta);
    }

    blockRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const layout = blockLayouts[i];
      if (!layout) return;
      const angle = layout.phase + time * layout.speed;
      mesh.position.set(Math.cos(angle) * layout.radius, layout.height + Math.sin(time * 0.4 + layout.phase) * 0.1, Math.sin(angle) * layout.radius * 0.6 - 0.6);
      mesh.rotation.x += delta * 0.3;
      mesh.rotation.y += delta * 0.22;
      const material = mesh.material as MeshStandardMaterial;
      material.opacity = damp(material.opacity, 0.55 * weight, 5, delta);
    });

    if (!dustInitialized.current) {
      const positions = dustHandle.current?.positions;
      if (positions) {
        const pointCount = positions.length / 3;
        for (let i = 0; i < pointCount; i += 1) {
          positions[i * 3] = (Math.random() - 0.5) * 6;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 3.4;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
        }
        dustInitialized.current = true;
        const attribute = dustHandle.current?.points?.geometry.attributes.position as
          | BufferAttribute
          | undefined;
        if (attribute) attribute.needsUpdate = true;
      }
    }
    const dustMaterial = dustHandle.current?.material;
    if (dustMaterial) dustMaterial.opacity = damp(dustMaterial.opacity, 0.28 * weight, 4, delta);
  });

  return (
    <group ref={groupRef} scale={objectScale} position={[0, 0.1, 0]}>
      <ParticleSystem ref={dustHandle} count={dustCount} size={0.02} color="#67e8f9" opacity={0} additive />

      <pointLight ref={screenLightRef} position={[0, 0.2, 0.9]} intensity={0} color="#fd6a50" distance={4} />

      {/* Soft additive bloom behind the screen — a cheap stand-in for real
          screen glow/bleed without a bloom post-processing pass. */}
      <mesh ref={glowRef} position={[0, 0.15, -0.05]}>
        <planeGeometry args={[3.4, 2.2]} />
        <meshBasicMaterial transparent opacity={0} color="#fd6a50" depthWrite={false} />
      </mesh>

      {/* Screen bezel */}
      <mesh position={[0, 0.15, -0.06]}>
        <boxGeometry args={[2.9, 1.85, 0.08]} />
        <meshStandardMaterial color="#0b0f1a" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Screen surface — the live terminal, driven entirely by the
          CanvasTexture drawn in useFrame above. */}
      <mesh ref={screenRef} position={[0, 0.15, 0]}>
        <planeGeometry args={[2.6, 1.6]} />
        <meshStandardMaterial
          transparent
          opacity={0}
          color="#000000"
          emissive="#ffffff"
          emissiveMap={texture}
          emissiveIntensity={0}
          roughness={0.35}
          metalness={0.1}
        />
      </mesh>

      {/* Desk surface, with a faint, fading reflection of the screen glow —
          a cheap trick standing in for a real planar reflection. */}
      <mesh ref={deskRef} position={[0, -0.78, 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.4, 1.6]} />
        <meshStandardMaterial transparent opacity={0} color="#0d1220" roughness={0.25} metalness={0.5} />
      </mesh>
      <mesh ref={reflectionRef} position={[0, -0.77, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.6, 1.2]} />
        <meshBasicMaterial transparent opacity={0} color="#fd6a50" depthWrite={false} />
      </mesh>

      {/* Abstracted, silhouette-only coder seated at the desk — deliberately
          unlit/flat rather than a detailed character model. */}
      <group position={[0.95, -0.55, 0.55]} scale={0.8}>
        <mesh ref={silhouetteHeadRef} position={[0, 0.42, 0]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial transparent opacity={0} color="#05070d" roughness={0.9} />
        </mesh>
        <mesh ref={silhouetteBodyRef} position={[0, 0.08, 0]}>
          <boxGeometry args={[0.4, 0.48, 0.26]} />
          <meshStandardMaterial transparent opacity={0} color="#05070d" roughness={0.9} />
        </mesh>
      </group>

      {/* Small floating "code block" accents drifting around the terminal —
          the "floating technical elements" that keep the space alive
          without competing with the screen content itself. */}
      {blockLayouts.map((_, index) => (
        <mesh
          key={`universe-code-block-${index}`}
          scale={0.09}
          ref={(mesh) => {
            if (mesh) blockRefs.current[index] = mesh;
          }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            transparent
            opacity={0}
            color="#67e8f9"
            emissive="#22d3ee"
            emissiveIntensity={0.6}
            roughness={0.3}
            metalness={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}
