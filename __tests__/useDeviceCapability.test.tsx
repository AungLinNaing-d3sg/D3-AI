import { renderHook } from "@testing-library/react";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";

function mockMatchMedia(matches: (query: string) => boolean) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: matches(query),
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe("useDeviceCapability", () => {
  it("enables the full-quality scene when motion isn't reduced and the viewport is wide", () => {
    mockMatchMedia(() => false);
    const { result } = renderHook(() => useDeviceCapability());

    expect(result.current.prefersReducedMotion).toBe(false);
    expect(result.current.enableScene).toBe(true);
    expect(result.current.quality).toBe("high");
  });

  it("disables the 3D scene entirely when the user prefers reduced motion", () => {
    mockMatchMedia((query) => query.includes("prefers-reduced-motion"));
    const { result } = renderHook(() => useDeviceCapability());

    expect(result.current.prefersReducedMotion).toBe(true);
    expect(result.current.enableScene).toBe(false);
  });

  it("drops to the low-quality tier on compact/mobile viewports", () => {
    mockMatchMedia((query) => query.includes("max-width"));
    const { result } = renderHook(() => useDeviceCapability());

    expect(result.current.isCompact).toBe(true);
    expect(result.current.tier).toBe("mobile");
    expect(result.current.quality).toBe("low");
    // Reduced motion is a separate, independent concern from viewport size.
    expect(result.current.enableScene).toBe(true);
  });

  it("drops to the medium-quality tablet tier for the tablet-range media query only", () => {
    mockMatchMedia((query) => query.includes("min-width: 768px"));
    const { result } = renderHook(() => useDeviceCapability());

    expect(result.current.isCompact).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.tier).toBe("tablet");
    expect(result.current.quality).toBe("medium");
  });

  it("gates parallax-worthy pointer effects on coarse/touch pointers independently of viewport width", () => {
    mockMatchMedia((query) => query.includes("pointer: coarse"));
    const { result } = renderHook(() => useDeviceCapability());

    expect(result.current.hasCoarsePointer).toBe(true);
    // A touch device can still be a wide/desktop-class viewport.
    expect(result.current.tier).toBe("desktop");
    expect(result.current.quality).toBe("high");
  });
});
