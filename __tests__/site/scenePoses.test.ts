import { BACKGROUND_OBJECTS, BACKGROUND_SECTIONS, SECTION_POSES, poseFor } from "@/components/three/background/scenePoses";
import { SECTION_IDS } from "@/data/home";

describe("3D background poses", () => {
  it("has an arrangement for every homepage section", () => {
    expect([...BACKGROUND_SECTIONS].sort()).toEqual([...SECTION_IDS].sort());
  });

  it("keeps every object in the side margins and clear of the header band", () => {
    BACKGROUND_SECTIONS.forEach((section) => {
      BACKGROUND_OBJECTS.forEach((object) => {
        const { nx, ny, z } = SECTION_POSES[section][object];
        expect(Math.abs(nx)).toBeGreaterThanOrEqual(0.45);
        expect(ny).toBeLessThanOrEqual(0.32);
        expect(z).toBeLessThanOrEqual(-4);
      });
    });
  });

  it("pushes objects further out and shrinks them on compact screens", () => {
    BACKGROUND_SECTIONS.forEach((section) => {
      BACKGROUND_OBJECTS.forEach((object) => {
        const wide = poseFor(section, object, 1, false);
        const compact = poseFor(section, object, 0.66, true);
        expect(Math.abs(compact.nx)).toBeGreaterThanOrEqual(0.55);
        expect(compact.s).toBeLessThan(wide.s);
      });
    });
  });
});
