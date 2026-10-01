import { STAGE_IDS, type StageId } from "@/types";
import { initJourneyTimeline } from "@/lib/motion/scrollTimeline";

/**
 * Regression coverage for the post-mount content-resize refresh fix in
 * `initJourneyTimeline` (see lib/motion/scrollTimeline.ts): a `ResizeObserver`
 * on the wrapper element re-measures stage bounds and calls
 * `ScrollTrigger.refresh()` whenever the wrapper's rendered height changes
 * after mount (e.g. GameSection swapping its menu for an active game's own
 * canvas), on top of the existing font-swap refresh path already covered by
 * __tests__/ScrollChoreographer.fontRefresh.test.ts.
 *
 * `gsap`/`ScrollTrigger` don't do anything meaningful in jsdom (no real
 * layout/scrolling), so this only asserts the wiring: the observer is
 * attached to the wrapper, its callback is debounced to a single
 * `requestAnimationFrame` before calling `ScrollTrigger.refresh()`, and it is
 * disconnected (and any pending frame cancelled) by the returned cleanup.
 */
const refresh = jest.fn();
const ensureGsapRegistered = jest.fn();
const kill = jest.fn();

jest.mock("@/lib/motion/gsap", () => ({
  ensureGsapRegistered: (...args: unknown[]) => ensureGsapRegistered(...args),
  ScrollTrigger: {
    create: () => ({ kill: (...args: unknown[]) => kill(...args) }),
    refresh: (...args: unknown[]) => refresh(...args),
  },
  gsap: {},
}));

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

type ResizeCallback = () => void;

describe("initJourneyTimeline resize-driven refresh", () => {
  const OriginalResizeObserver = (global as { ResizeObserver?: unknown }).ResizeObserver;
  let observedCallback: ResizeCallback | undefined;
  let observe: jest.Mock;
  let disconnect: jest.Mock;

  beforeEach(() => {
    refresh.mockClear();
    ensureGsapRegistered.mockClear();
    kill.mockClear();
    observedCallback = undefined;
    observe = jest.fn();
    disconnect = jest.fn();

    (global as { ResizeObserver?: unknown }).ResizeObserver = jest
      .fn()
      .mockImplementation((callback: ResizeCallback) => {
        observedCallback = callback;
        return { observe, disconnect, unobserve: jest.fn() };
      });
  });

  afterEach(() => {
    (global as { ResizeObserver?: unknown }).ResizeObserver = OriginalResizeObserver;
  });

  function buildStages(): { stageEls: { id: StageId; el: HTMLElement }[]; wrapper: HTMLElement } {
    const wrapper = document.createElement("div");
    const stageEls = STAGE_IDS.map((id) => {
      const el = document.createElement("section");
      wrapper.appendChild(el);
      return { id, el };
    });
    document.body.appendChild(wrapper);
    return { stageEls, wrapper };
  }

  it("observes the wrapper element for content-size changes", () => {
    const { stageEls, wrapper } = buildStages();
    const cleanup = initJourneyTimeline(stageEls, wrapper);

    expect(observe).toHaveBeenCalledWith(wrapper);

    cleanup();
    document.body.removeChild(wrapper);
  });

  it("calls ScrollTrigger.refresh() on the next frame after an observed resize", async () => {
    const { stageEls, wrapper } = buildStages();
    const cleanup = initJourneyTimeline(stageEls, wrapper);

    expect(refresh).not.toHaveBeenCalled();

    observedCallback?.();
    expect(refresh).not.toHaveBeenCalled(); // deferred to the next frame, not synchronous

    await nextFrame();
    await nextFrame();

    expect(refresh).toHaveBeenCalledTimes(1);

    cleanup();
    document.body.removeChild(wrapper);
  });

  it("disconnects the observer and cancels any pending refresh frame on cleanup", async () => {
    const { stageEls, wrapper } = buildStages();
    const cleanup = initJourneyTimeline(stageEls, wrapper);

    observedCallback?.();
    cleanup();

    await nextFrame();
    await nextFrame();

    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();

    document.body.removeChild(wrapper);
  });
});
