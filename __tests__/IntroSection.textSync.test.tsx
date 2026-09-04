import { act, render } from "@testing-library/react";
import { IntroSection } from "@/components/sections/IntroSection";
import { journeyState, resetJourneyState } from "@/lib/motion/journeyState";

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Regression test for the intro chapter's hero-copy fade (see
 * components/sections/IntroSection.tsx). It previously faded to
 * `opacity: 0` using an unrelated multiplier (`1 - progress * 1.7`) that
 * reached zero around 59% of the chapter's scroll — long before the
 * starfield/nebula 3D scene's own crossfade (`journeyState.weight.intro`,
 * driven by `crossfadeWeight` in lib/motion/scrollTimeline.ts) finished
 * dissolving at ~78-100%. That mismatch left a long stretch of scroll with
 * no headline/tagline text over a still fully-visible 3D scene. The hero
 * copy must now fade on the exact same weight the 3D scene uses so both
 * dissolve together.
 */
describe("IntroSection hero-copy / 3D-scene fade sync", () => {
  afterEach(() => {
    resetJourneyState();
  });

  it("keeps the hero copy fully opaque while the intro scene's own crossfade weight is still 1", async () => {
    const { container } = render(<IntroSection />);

    journeyState.progress.intro = 0.6;
    journeyState.weight.intro = 1; // scene hasn't started dissolving yet
    await act(async () => {
      await nextFrame();
    });

    const heading = container.querySelector("h1");
    const heroContent = heading?.parentElement;
    expect(heroContent).not.toBeNull();
    expect(Number(heroContent?.style.opacity)).toBe(1);
  });

  it("fades the hero copy in lockstep with the intro scene's crossfade weight, not a disconnected progress formula", async () => {
    const { container } = render(<IntroSection />);

    // Under the old `1 - progress * 1.7` formula this would already be 0.
    journeyState.progress.intro = 0.85;
    journeyState.weight.intro = 0.4;
    await act(async () => {
      await nextFrame();
    });

    const heading = container.querySelector("h1");
    const heroContent = heading?.parentElement;
    expect(Number(heroContent?.style.opacity)).toBeCloseTo(0.4);
  });
});
