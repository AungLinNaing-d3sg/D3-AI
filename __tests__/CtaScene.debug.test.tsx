import { render } from "@testing-library/react";
import { CtaScene } from "@/components/three/scenes/CtaScene";

/**
 * Chapter 08 (Final CTA) 3D scene. `@react-three/fiber`/`@react-three/drei`
 * are stubbed for the whole suite (see jest.config.ts `moduleNameMapper` +
 * src/test/mocks/*) since jsdom has no WebGL context — `useFrame` is a
 * no-op there, so this suite can only assert the *static* render tree
 * (structure/initial props), not the per-frame opacity/scale damping math
 * itself (unreachable without a real frame loop) — matching the existing
 * UniverseScene debug suite's approach.
 *
 * Regression coverage for the CTA glow readability fix: the emissive core
 * must sit set back from the camera instead of centred directly behind the
 * heading, and shrink to a smaller radius — see the notes in
 * components/three/scenes/CtaScene.tsx. Its `opacity`/`transparent` starting
 * props (fading in via `useFrame` rather than snapping straight to a fully
 * opaque, saturated blob) are NOT asserted here: `<MeshDistortMaterial>` is
 * a real drei *component* (unlike the lowercase `<mesh>`/`<icosahedronGeometry>`
 * host tags below, which react-dom renders as literal, inspectable
 * elements), and the project's `@react-three/drei` test stub (see
 * src/test/mocks/react-three-drei.tsx) always renders it as `null`
 * regardless of props, so its opacity/transparency can't be observed from
 * the DOM in this suite.
 */
describe("CtaScene", () => {
  it("renders without crashing for both quality tiers", () => {
    expect(() => render(<CtaScene quality="high" />)).not.toThrow();
    expect(() => render(<CtaScene quality="low" />)).not.toThrow();
  });

  it("renders exactly one emissive core mesh, set back from the camera", () => {
    const { container } = render(<CtaScene quality="high" />);

    const cores = container.querySelectorAll("icosahedrongeometry");
    expect(cores).toHaveLength(1);
    expect(cores[0]).toHaveAttribute("args", "0.72,8");

    const mesh = cores[0]?.parentElement;
    expect(mesh?.tagName.toLowerCase()).toBe("mesh");
    expect(mesh).toHaveAttribute("position", "0,0,-1.6");
  });

  it("renders exactly one sparkle particle system host", () => {
    const { container } = render(<CtaScene quality="high" />);
    // 1 root group (the mesh's own group wrapper is implicit via r3f/jsx,
    // so only the top-level scene group is asserted here).
    expect(container.querySelectorAll("group")).toHaveLength(1);
  });
});
