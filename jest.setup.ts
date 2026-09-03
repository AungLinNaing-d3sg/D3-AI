import "@testing-library/jest-dom";

// jsdom does not implement matchMedia. Several hooks (reduced-motion,
// viewport/device-capability detection) rely on it, so provide a minimal,
// overridable stub for the whole test suite.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
