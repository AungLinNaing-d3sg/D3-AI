"use client";

import { forwardRef, Suspense, useMemo } from "react";
import { Center, Text3D } from "@react-three/drei";
import { ExtrudeGeometry, MeshPhysicalMaterial, Shape, type Group, type IUniform, type Material } from "three";
import {
  logoCausticFragmentBody,
  logoCausticFragmentHead,
  logoCausticVertexBody,
  logoCausticVertexHead,
} from "@/components/three/scenes/ocean/oceanShaders";

/**
 * The D3-SG mark as a physical object for the deep-ocean chapter: the red
 * square with its white serif "D" (a bevelled slab with the letter raised
 * from its face) beside the extruded "3SG" wordmark — the logo in
 * public/D3SG-logo.png, built as geometry so light can actually move across
 * it. Clear-coated physical materials catch the scene's moving overhead
 * spot, cyan/violet side lights and rim light, and water caustics play over
 * every surface (injected into the materials via `onBeforeCompile`).
 */

const BRAND_RED = "#e5412f";

function roundedRect(w: number, h: number, r: number): Shape {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** A bold serif "D": stem with bracketed serifs, a full bowl, and its counter. */
function serifD(): Shape {
  const s = new Shape();
  // Outline (unit ≈ letter height 0.62), from the bottom-left serif, clockwise.
  s.moveTo(-0.24, -0.31);
  s.lineTo(0.02, -0.31);
  s.bezierCurveTo(0.2, -0.31, 0.27, -0.2, 0.27, 0);
  s.bezierCurveTo(0.27, 0.2, 0.2, 0.31, 0.02, 0.31);
  s.lineTo(-0.24, 0.31);
  s.lineTo(-0.24, 0.27);
  s.lineTo(-0.19, 0.26);
  s.lineTo(-0.19, -0.26);
  s.lineTo(-0.24, -0.27);
  s.lineTo(-0.24, -0.31);
  // Counter.
  const hole = new Shape();
  hole.moveTo(-0.075, -0.25);
  hole.lineTo(0.0, -0.25);
  hole.bezierCurveTo(0.11, -0.25, 0.14, -0.14, 0.14, 0);
  hole.bezierCurveTo(0.14, 0.14, 0.11, 0.25, 0.0, 0.25);
  hole.lineTo(-0.075, 0.25);
  hole.lineTo(-0.075, -0.25);
  s.holes.push(hole);
  return s;
}

export interface OceanLogoUniforms {
  uTime: IUniform<number>;
  uCaustic: IUniform<number>;
  [key: string]: IUniform<unknown>;
}

/** Adds the ocean caustics to a physical material, sharing `uniforms`. */
function withCaustics(material: MeshPhysicalMaterial, uniforms: OceanLogoUniforms): MeshPhysicalMaterial {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${logoCausticVertexHead}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${logoCausticVertexBody}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${logoCausticFragmentHead}`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n${logoCausticFragmentBody}`);
  };
  material.customProgramCacheKey = () => "ocean-caustic";
  return material;
}

export interface OceanLogoMaterials {
  all: Material[];
}

export function useOceanLogoMaterials(uniforms: OceanLogoUniforms) {
  return useMemo(() => {
    const slab = withCaustics(
      new MeshPhysicalMaterial({ color: BRAND_RED, roughness: 0.32, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.12, transparent: true, fog: false }),
      uniforms
    );
    const letter = withCaustics(
      new MeshPhysicalMaterial({ color: "#f4f1ec", roughness: 0.22, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, fog: false }),
      uniforms
    );
    const word = withCaustics(
      new MeshPhysicalMaterial({ color: BRAND_RED, roughness: 0.28, metalness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15, transparent: true, fog: false }),
      uniforms
    );
    return { slab, letter, word, all: [slab, letter, word] as Material[] };
  }, [uniforms]);
}

export const OceanLogo = forwardRef<Group, { materials: ReturnType<typeof useOceanLogoMaterials> }>(function OceanLogo({ materials }, ref) {
  const geometries = useMemo(() => {
    const slab = new ExtrudeGeometry(roundedRect(0.78, 0.78, 0.07), {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.025,
      bevelSegments: 4,
      curveSegments: 10,
    });
    slab.translate(0, 0, -0.08);
    const letter = new ExtrudeGeometry(serifD(), {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.01,
      bevelSegments: 3,
      curveSegments: 16,
    });
    letter.translate(0.01, 0, 0.1);
    return { slab, letter };
  }, []);

  return (
    <group ref={ref}>
      <group position={[-0.92, 0, 0]}>
        <mesh geometry={geometries.slab} material={materials.slab} />
        <mesh geometry={geometries.letter} material={materials.letter} />
      </group>
      <Suspense fallback={null}>
        <Center position={[0.42, 0, 0]} cacheKey="d3sg-3sg">
          <Text3D
            font="/fonts/helvetiker_regular.typeface.json"
            size={0.56}
            height={0.12}
            letterSpacing={0.03}
            curveSegments={8}
            bevelEnabled
            bevelThickness={0.018}
            bevelSize={0.012}
            bevelSegments={3}
            material={materials.word}
          >
            3SG
          </Text3D>
        </Center>
      </Suspense>
    </group>
  );
});
