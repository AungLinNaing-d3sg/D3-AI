/**
 * Test-only stand-in for `@react-three/drei` (see jest.config.ts
 * `moduleNameMapper`). Only exports the members this project actually
 * imports; extend this file if a new drei import is introduced.
 */
import { forwardRef, type ReactNode } from "react";

export const MeshDistortMaterial = forwardRef(function MeshDistortMaterial() {
  return null;
});

/** `<Html>` normally portals real DOM content to follow a 3D object; in
 * jsdom (no WebGL/camera) it just renders its children inline so any
 * section/page test that happens to mount a scene tree containing one still
 * sees the real accessible text. */
export function Html({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
