import { render } from "@testing-library/react";
import { UniverseScene } from "@/components/three/scenes/UniverseScene";
import { universeStations } from "@/data/journey";

/**
 * Chapter 05 (Data Universe / "By the numbers") 3D scene. `@react-three/fiber`
 * and `@react-three/drei` are stubbed for the whole suite (see jest.config.ts
 * `moduleNameMapper` + src/test/mocks/*) since jsdom has no WebGL context —
 * `useFrame` is a no-op there, so this suite can only assert the *static*
 * render tree (structure/content), not the per-frame morph/camera-dolly math
 * itself (unreachable without a real frame loop) — see
 * __tests__/ProductScene.debug.test.tsx for the same pattern.
 *
 * Regression coverage for the redesigned per-statistic "stations" (one
 * particle field + hand-authored node/line structure per real statistic,
 * see three/scenes/UniverseScene.tsx `STATION_LAYOUTS`) and the very
 * large, low-opacity background typography behind them.
 */
describe("UniverseScene", () => {
  it("renders without crashing for both quality tiers", () => {
    expect(() => render(<UniverseScene quality="high" />)).not.toThrow();
    expect(() => render(<UniverseScene quality="low" />)).not.toThrow();
  });

  it("renders one particle field per real statistic, plus one per background word", () => {
    const { container } = render(<UniverseScene quality="high" />);
    // 4 real statistic stations + 4 background typography words.
    expect(container.querySelectorAll("points")).toHaveLength(universeStations.length + 4);
  });

  it("assembles the hand-authored node/edge structure for every station", () => {
    const { container } = render(<UniverseScene quality="high" />);
    // Singapore (7) + 20+ years (6) + Microsoft (8) + Real-world (6) nodes.
    expect(container.querySelectorAll("icosahedrongeometry")).toHaveLength(27);
    // Singapore (8) + 20+ years (5) + Microsoft (12) + Real-world (7) edges.
    expect(container.querySelectorAll("line")).toHaveLength(32);
  });

  it("gives only the Real-world station travelling particle couriers, and only at high quality", () => {
    const high = render(<UniverseScene quality="high" />);
    // Real-world has 7 connections -> 7 travelling couriers.
    expect(high.container.querySelectorAll("spheregeometry")).toHaveLength(7);

    const low = render(<UniverseScene quality="low" />);
    expect(low.container.querySelectorAll("spheregeometry")).toHaveLength(0);
  });

  it("covers exactly the 4 real, sourced statistics in a fixed, meaningful order", () => {
    expect(universeStations.map((station) => station.stat.token)).toEqual([
      "Singapore",
      "20+ years",
      "Microsoft",
      "Real-world",
    ]);
    expect(universeStations.map((station) => station.variant)).toEqual([
      "location",
      "timeline",
      "network",
      "impact",
    ]);
  });
});
