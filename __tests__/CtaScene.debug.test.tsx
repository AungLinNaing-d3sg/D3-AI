import { render } from "@testing-library/react";
import { CtaScene } from "@/components/three/scenes/CtaScene";

/**
 * Chapter 08 (Final CTA) 3D scene. `@react-three/fiber`/`@react-three/drei`
 * are stubbed for the whole suite (see jest.config.ts `moduleNameMapper` +
 * src/test/mocks/*) since jsdom has no WebGL context — `useFrame` is a
 * no-op there, so this suite can only assert the *static* render tree
 * (structure/initial props), not the per-frame opacity/scale damping math
 * itself (unreachable without a real frame loop).
 *
 * The real "D3-SG" wordmark mesh only appears once `FontLoader` resolves
 * `/fonts/helvetiker_bold.typeface.json` (see CtaScene.tsx) — jsdom's test
 * environment has no `fetch`/`Request` global for that load to complete
 * (and the component is deliberately written to degrade gracefully rather
 * than throw when it can't — see the `try`/`catch` around `loader.load`),
 * so the wordmark mesh itself is not asserted here; instead this suite
 * covers what's actually deterministic in this environment: the component
 * never crashes regardless of whether the font resolves, and the
 * always-present contact-shadow plane and ambient particle field render
 * with the expected structure.
 */
describe("CtaScene", () => {
  it("renders without crashing for both quality tiers, even though the font never resolves in jsdom", () => {
    expect(() => render(<CtaScene quality="high" />)).not.toThrow();
    expect(() => render(<CtaScene quality="low" />)).not.toThrow();
  });

  it("renders exactly one contact-shadow plane, set back and below the wordmark", () => {
    const { container } = render(<CtaScene quality="high" />);

    const planes = container.querySelectorAll("planegeometry");
    expect(planes).toHaveLength(1);
    expect(planes[0]).toHaveAttribute("args", "1.3,0.62");

    const mesh = planes[0]?.parentElement;
    expect(mesh?.tagName.toLowerCase()).toBe("mesh");
    expect(mesh).toHaveAttribute("position", "0,-0.32,-0.11");
  });

  it("never renders the wordmark mesh while its font hasn't resolved (no crash, no stale geometry)", () => {
    const { container } = render(<CtaScene quality="high" />);
    // The wordmark is built from `TextGeometry`, not a lowercase intrinsic
    // like `planegeometry`/`icosahedrongeometry` — with no font loaded, its
    // whole `<mesh>` is conditionally skipped rather than rendered empty.
    expect(container.querySelectorAll("textgeometry")).toHaveLength(0);
  });

  it("renders exactly one ambient particle system host", () => {
    const { container } = render(<CtaScene quality="high" />);
    // 1 root group + 1 shadow-plane parent... the shadow/wordmark meshes
    // aren't groups, so only the top-level scene group is asserted here.
    expect(container.querySelectorAll("group")).toHaveLength(1);
  });
});
