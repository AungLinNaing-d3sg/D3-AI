import { SRGBColorSpace } from "three";
import { getThemeColors, parseCssColor } from "@/lib/three/themeColors";

describe("theme colour tokens", () => {
  it("parses hex, rgb() and oklch() without any canvas read-back", () => {
    expect(parseCssColor("#f14a30")?.getHexString()).toBe("f14a30");
    expect(parseCssColor("rgb(241 74 48)")?.getHexString()).toBe("f14a30");
    // Tailwind v4's cyan-400.
    const cyan = parseCssColor("oklch(78.9% 0.154 211.53)")!;
    const { r, g, b } = cyan.clone().getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace);
    expect(r).toBeLessThan(0.15);
    expect(g).toBeGreaterThan(0.75);
    expect(b).toBeGreaterThan(0.85);
    expect(parseCssColor("not-a-colour")).toBeNull();
  });

  it("falls back to the documented token values when a variable is missing", () => {
    expect(getThemeColors().brand500.getHexString()).toBe("f14a30");
  });
});
