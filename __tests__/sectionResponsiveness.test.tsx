import { render } from "@testing-library/react";
import { IntroSection } from "@/components/sections/IntroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { TypographySection } from "@/components/sections/TypographySection";
import { NeuralSection } from "@/components/sections/NeuralSection";
import { UniverseSection } from "@/components/sections/UniverseSection";
import { GameSection } from "@/components/sections/GameSection";
import { FutureSection } from "@/components/sections/FutureSection";
import type { StageId } from "@/types";

/**
 * Regression coverage for the mobile-responsive / compact-pin fix (see
 * components/sections/*.tsx + components/ui/Section.tsx): every chapter
 * that used to force a fixed, unconditional `sticky top-0 h-[100svh]` pin
 * (and a multi-viewport `min-h`, e.g. Typography's old 440vh) must instead
 * only pin from the tablet breakpoint up (`md:sticky`) — flowing normally
 * on mobile so scrolling reads as a normal website, not a full-screen
 * scroll-jack — and keep its own `min-h` within the compact ranges this
 * feature specifies (mobile ~70-100vh, tablet ~90-120vh, desktop ~100-140vh)
 * rather than multiple stacked viewport heights.
 */
const chapters: { id: StageId; Section: () => React.JSX.Element }[] = [
  { id: "intro", Section: IntroSection },
  { id: "about", Section: AboutSection },
  { id: "typography", Section: TypographySection },
  { id: "neural", Section: NeuralSection },
  { id: "universe", Section: UniverseSection },
  { id: "game", Section: GameSection },
  { id: "future", Section: FutureSection },
];

function extractMinHeightVh(className: string): number[] {
  return Array.from(className.matchAll(/min-h-\[(\d+(?:\.\d+)?)vh\]/g)).map((match) =>
    Number(match[1])
  );
}

describe("chapter section responsiveness", () => {
  it.each(chapters)("keeps the '$id' chapter's own min-height within the compact 70-140vh budget", ({ id, Section }) => {
    render(<Section />);
    const el = document.getElementById(id);
    expect(el).not.toBeNull();

    const vhValues = extractMinHeightVh(el?.className ?? "");
    expect(vhValues.length).toBeGreaterThan(0);
    vhValues.forEach((vh) => {
      expect(vh).toBeGreaterThanOrEqual(70);
      expect(vh).toBeLessThanOrEqual(140);
    });
  });

  it.each(chapters)("only pins the '$id' chapter's hero content from the tablet breakpoint up, not unconditionally on mobile", ({ Section }) => {
    const { container } = render(<Section />);
    const pinnedCandidates = Array.from(container.querySelectorAll<HTMLElement>("div"));

    // At least one wrapper must opt into the tablet+ pin...
    expect(pinnedCandidates.some((el) => el.className.includes("md:sticky"))).toBe(true);
    // ...and none may force the old unconditional mobile-included pin.
    pinnedCandidates.forEach((el) => {
      const classes = el.className.split(/\s+/);
      expect(classes).not.toContain("sticky");
    });
  });
});
