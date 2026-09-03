/**
 * Test-only stand-in for `@react-three/drei` (see jest.config.ts
 * `moduleNameMapper`). Only exports the members this project actually
 * imports; extend this file if a new drei import is introduced.
 */
import { forwardRef } from "react";

export const MeshDistortMaterial = forwardRef(function MeshDistortMaterial() {
  return null;
});
