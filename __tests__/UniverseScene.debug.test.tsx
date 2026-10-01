import { render } from "@testing-library/react";
import { UniverseScene } from "@/components/three/scenes/UniverseScene";
import { universeStations } from "@/data/journey";

/**
 * Chapter 05 (Data Universe / "By the numbers") 3D scene. `@react-three/fiber`
 * and `@react-three/drei` are stubbed for the whole suite (see jest.config.ts
 * `moduleNameMapper` + src/test/mocks/*) since jsdom has no WebGL context —
 * `useFrame` is a no-op there, so this suite can only assert the *static*
 * render tree (structure/content), not the per-frame typewriter/camera-dolly
 * math itself (unreachable without a real frame loop) — see
 * __tests__/CtaScene.debug.test.tsx for the same pattern.
 *
 * Regression coverage for the "live coding terminal" backdrop (a single
 * `CanvasTexture`-driven screen, bezel, desk with a faint reflection, an
 * abstracted coder silhouette, and a handful of device-tiered floating
 * "code block" accents — see three/scenes/UniverseScene.tsx) that replaced
 * the previous per-statistic particle-formation stations.
 */
describe("UniverseScene", () => {
  it("renders without crashing for every quality tier", () => {
    expect(() => render(<UniverseScene quality="high" />)).not.toThrow();
    expect(() => render(<UniverseScene quality="medium" />)).not.toThrow();
    expect(() => render(<UniverseScene quality="low" />)).not.toThrow();
  });

  it("renders exactly one shared ambient particle field, not one per statistic", () => {
    const { container } = render(<UniverseScene quality="high" />);
    expect(container.querySelectorAll("points")).toHaveLength(1);
  });

  it("assembles the terminal composition: bezel, screen, desk, reflection, glow, and a screen light", () => {
    const { container } = render(<UniverseScene quality="high" />);
    // 4 planes: glow bloom, screen surface, desk surface, desk reflection.
    expect(container.querySelectorAll("planegeometry")).toHaveLength(4);
    // Silhouette head is the only sphere in the composition.
    expect(container.querySelectorAll("spheregeometry")).toHaveLength(1);
    expect(container.querySelectorAll("pointlight")).toHaveLength(1);
  });

  it("renders fewer floating code-block accents on lower device tiers", () => {
    const high = render(<UniverseScene quality="high" />);
    const medium = render(<UniverseScene quality="medium" />);
    const low = render(<UniverseScene quality="low" />);
    // boxgeometry = 1 screen bezel + 1 silhouette body + N code blocks.
    expect(high.container.querySelectorAll("boxgeometry")).toHaveLength(2 + 4);
    expect(medium.container.querySelectorAll("boxgeometry")).toHaveLength(2 + 3);
    expect(low.container.querySelectorAll("boxgeometry")).toHaveLength(2 + 2);
  });

  it("covers exactly the 4 real, sourced statistics in a fixed, meaningful order", () => {
    expect(universeStations.map((station) => station.stat.token)).toEqual([
      "Singapore",
      "20+ years",
      "Microsoft",
      "Real-world",
    ]);
  });
});
