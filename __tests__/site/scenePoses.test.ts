import { BACKGROUND_OBJECTS, BACKGROUND_SECTIONS, SECTION_POSES, poseFor } from "@/components/three/background/scenePoses";
import { SECTION_IDS } from "@/data/home";

describe("3D background poses", () => {
  it("has an arrangement for every homepage section", () => {
    expect([...BACKGROUND_SECTIONS].sort()).toEqual([...SECTION_IDS].sort());
  });

  it("keeps every object in the side margins and clear of the header band after the hero", () => {
    BACKGROUND_SECTIONS.filter((section) => section !== "hero").forEach((section) => {
      BACKGROUND_OBJECTS.forEach((object) => {
        const { nx, ny, z } = SECTION_POSES[section][object];
        expect(Math.abs(nx)).toBeGreaterThanOrEqual(0.45);
        expect(ny).toBeLessThanOrEqual(0.32);
        expect(z).toBeLessThanOrEqual(-3);
      });
    });
  });

  it("centres the pearl behind the hero title on every screen size", () => {
    expect(SECTION_POSES.hero.main.nx).toBe(0);
    expect(poseFor("hero", "main", 0.66, true).nx).toBe(0);
  });

  it("pushes objects further out and shrinks them on compact screens", () => {
    BACKGROUND_SECTIONS.filter((section) => section !== "hero").forEach((section) => {
      BACKGROUND_OBJECTS.forEach((object) => {
        const wide = poseFor(section, object, 1, false);
        const compact = poseFor(section, object, 0.66, true);
        expect(Math.abs(compact.nx)).toBeGreaterThanOrEqual(0.55);
        expect(compact.s).toBeLessThan(wide.s);
      });
    });
  });
});
