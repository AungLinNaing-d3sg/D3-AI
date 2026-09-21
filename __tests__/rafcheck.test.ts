/**
 * Several "AI Engineering Playground" experiences (components/game/*.tsx)
 * drive their terminal/log/status reveal loops off `setInterval`, and their
 * decorative R3F scenes off `requestAnimationFrame`/`cancelAnimationFrame`
 * directly (no fake/shimmed loop). This is a guard test: if the jsdom test
 * environment ever stops providing these globals, every loop-driven test
 * would fail for a confusing, indirect reason — this makes the real cause
 * obvious immediately.
 */
describe("jsdom test environment", () => {
  it("provides requestAnimationFrame and cancelAnimationFrame", () => {
    expect(typeof window.requestAnimationFrame).toBe("function");
    expect(typeof window.cancelAnimationFrame).toBe("function");
  });
});
