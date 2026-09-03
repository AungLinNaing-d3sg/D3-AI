/**
 * Test-only stand-in for `@react-three/fiber` (see jest.config.ts
 * `moduleNameMapper`). jsdom has no WebGL context, so mounting a real
 * `<Canvas>` in RTL tests throws; this renders children as a plain `<div>`
 * and turns the imperative hooks into no-ops so section/page tests can
 * still assert on the surrounding real DOM content.
 */
import { type ReactNode } from "react";

export function Canvas({ children }: { children?: ReactNode }) {
  return <div data-testid="mock-r3f-canvas">{children}</div>;
}

export function useFrame() {
  return undefined;
}

export function useThree() {
  return {
    camera: { position: { x: 0, y: 0, z: 0 }, fov: 45 },
    pointer: { x: 0, y: 0 },
  };
}

export function extend() {
  return undefined;
}
