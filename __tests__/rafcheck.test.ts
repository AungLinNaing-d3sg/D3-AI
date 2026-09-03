/**
 * The "TRAIN YOUR AI" mini-game (components/game/TrainYourAI.tsx) drives its
 * whole gameplay loop off `requestAnimationFrame`/`cancelAnimationFrame`
 * directly (no fake/shimmed loop). This is a guard test: if the jsdom test
 * environment ever stops providing these globals, every game-loop-driven
 * test would fail for a confusing, indirect reason — this makes the real
 * cause obvious immediately.
 */
describe("jsdom test environment", () => {
  it("provides requestAnimationFrame and cancelAnimationFrame", () => {
    expect(typeof window.requestAnimationFrame).toBe("function");
    expect(typeof window.cancelAnimationFrame).toBe("function");
  });
});
