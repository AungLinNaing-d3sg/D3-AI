import { render } from "@testing-library/react";
import { CTA_TIERS, CtaScene } from "@/components/three/scenes/CtaScene";
import { ctaPhaseAt, ctaStoryPhases, ctaSyncAt, type CtaStoryPhases } from "@/lib/motion/ctaStory";

/**
 * Chapter 08 intelligence-core scene. `@react-three/fiber` is stubbed for
 * the whole suite (see jest.config.ts `moduleNameMapper` + src/test/mocks/*)
 * since jsdom has no WebGL context — `useFrame` is a no-op there — so this
 * suite asserts the static render tree per tier and mode, the tier budgets,
 * and the pure scroll-story mapping, not the per-frame choreography.
 */
describe("CtaScene", () => {
  it.each(["high", "medium", "low"] as const)("renders without crashing on the %s tier", (quality) => {
    expect(() => render(<CtaScene quality={quality} />)).not.toThrow();
  });

  it("builds the core in layers: shell, gyroscope rings, plates, lattice and supporting structures", () => {
    const { container } = render(<CtaScene quality="high" />);
    // haze, dust, data points, streams, halos, backdrop nodes
    expect(container.querySelectorAll("points")).toHaveLength(6);
    // lattice nodes and band studs, instanced
    expect(container.querySelectorAll("primitive")).toHaveLength(2);
    // key, fill, rim and the core's own orange emission
    expect(container.querySelectorAll("pointlight")).toHaveLength(4);
  });

  it("still (reduced-motion) mode carries its own ambient base light", () => {
    const { container } = render(<CtaScene quality="medium" still />);
    expect(container.querySelectorAll("ambientlight")).toHaveLength(1);
  });

  it("simplifies deliberately for tablet and mobile rather than only scaling down", () => {
    const { high, medium, low } = CTA_TIERS;
    expect(low.particles).toBeLessThan(high.particles / 3);
    expect(low.streams).toBeLessThan(high.streams / 2);
    expect(medium.backdrop.panels).toBeLessThan(high.backdrop.panels);
    expect(low.backdrop.panels).toBe(0);
    expect(low.rings).toBeLessThan(high.rings);
    expect(low.transmission).toBe(false);
    expect(low.pointer).toBe(false);
    expect(low.contentShield).toBeGreaterThan(high.contentShield);
  });
});

describe("ctaStory", () => {
  const phases = (progress: number) =>
    ctaStoryPhases(progress, { wake: 0, converge: 0, connect: 0, organize: 0, energy: 0, complete: 0 });

  it("is dormant at the start and fully settled at the end", () => {
    const start = phases(0);
    const end = phases(1);
    (Object.keys(start) as (keyof CtaStoryPhases)[]).forEach((key) => {
      expect(start[key]).toBe(0);
      expect(end[key]).toBe(1);
    });
  });

  it("only ever moves forward with scroll, so scrolling back reverses it exactly", () => {
    let previous = phases(0);
    for (let i = 1; i <= 100; i += 1) {
      const next = phases(i / 100);
      (Object.keys(next) as (keyof CtaStoryPhases)[]).forEach((key) => {
        expect(next[key]).toBeGreaterThanOrEqual(previous[key]);
      });
      previous = { ...next };
    }
    expect(phases(0.4)).toEqual(phases(0.4));
  });

  it("runs the four activation phases in order", () => {
    expect(ctaPhaseAt(0.1)).toBe("enter");
    expect(ctaPhaseAt(0.4)).toBe("connect");
    expect(ctaPhaseAt(0.7)).toBe("intelligence");
    expect(ctaPhaseAt(0.95)).toBe("complete");
    expect(ctaSyncAt(0)).toBe(0);
    expect(ctaSyncAt(1)).toBe(100);
  });
});
