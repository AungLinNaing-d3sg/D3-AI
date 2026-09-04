import { createElement } from "react";
import { act, render } from "@testing-library/react";
import { STAGE_IDS } from "@/types";
import { ScrollChoreographer } from "@/components/motion/ScrollChoreographer";

/**
 * Regression coverage for the scrollytelling text/visual sync fix in
 * `ScrollChoreographer` (see components/motion/ScrollChoreographer.tsx and
 * lib/motion/scrollTimeline.ts): `next/font`'s `display: "swap"` means the
 * real display/body typefaces can swap in *after* first paint, reflowing
 * chapter heights that the scroll-journey timeline had already measured —
 * silently desyncing every chapter's caption/highlight and 3D scene from
 * the user's actual scroll position ("text appears too early/late").
 *
 * `gsap`/`ScrollTrigger` don't do anything meaningful in jsdom (no real
 * layout or scrolling — see src/test/mocks/reveal.tsx for the same
 * limitation), so this test mocks the shared `lib/motion/gsap` module and
 * only asserts the *wiring*: once the page's web fonts finish loading,
 * `ScrollTrigger.refresh()` is called so stage bounds get re-measured
 * against the final layout.
 */
const refresh = jest.fn();
const ensureGsapRegistered = jest.fn();

jest.mock("@/lib/motion/gsap", () => ({
  ensureGsapRegistered: (...args: unknown[]) => ensureGsapRegistered(...args),
  ScrollTrigger: { refresh: (...args: unknown[]) => refresh(...args) },
  gsap: {},
}));

interface FakeFontFaceSet {
  ready: Promise<FakeFontFaceSet>;
}

describe("ScrollChoreographer font-swap refresh", () => {
  const originalFonts = (document as Document & { fonts?: FakeFontFaceSet }).fonts;
  let resolveReady: (() => void) | undefined;

  beforeEach(() => {
    refresh.mockClear();
    ensureGsapRegistered.mockClear();
    const readyPromise = new Promise<FakeFontFaceSet>((resolve) => {
      resolveReady = () => resolve({} as FakeFontFaceSet);
    });
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: readyPromise } satisfies FakeFontFaceSet,
    });
  });

  afterEach(() => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: originalFonts,
    });
  });

  it("refreshes ScrollTrigger once the real web fonts finish loading, so stage bounds are re-measured against the final layout", async () => {
    // `ScrollChoreographer` also queries `[data-stage]` elements inside
    // `#experience-wrapper` on a deferred frame; providing them (even
    // without real content) keeps that unrelated effect from erroring,
    // matching every real stage id in document order.
    const wrapper = document.createElement("div");
    wrapper.id = "experience-wrapper";
    STAGE_IDS.forEach((id) => {
      const stage = document.createElement("section");
      stage.dataset.stage = id;
      wrapper.appendChild(stage);
    });
    document.body.appendChild(wrapper);

    render(createElement(ScrollChoreographer));

    expect(refresh).not.toHaveBeenCalled();

    await act(async () => {
      resolveReady?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(refresh).toHaveBeenCalledTimes(1);

    document.body.removeChild(wrapper);
  });
});
