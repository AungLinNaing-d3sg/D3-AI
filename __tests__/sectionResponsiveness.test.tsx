import { render } from "@testing-library/react";
import { HeroSection } from "@/components/sections/HeroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { ApproachSection } from "@/components/sections/ApproachSection";
import { HowWeBuildSection } from "@/components/sections/HowWeBuildSection";
import { NumbersSection } from "@/components/sections/NumbersSection";
import { PlaygroundSection } from "@/components/sections/PlaygroundSection";
import { VisionSection } from "@/components/sections/VisionSection";
import { FaqSection } from "@/components/sections/FaqSection";
import type { StageId } from "@/types";

/**
 * Regression coverage for the chapters' scroll behaviour (see
 * components/sections/*.tsx + components/ui/Section.tsx): no chapter may
 * pin its content (`sticky` / `md:sticky`) at any breakpoint — the page
 * always scrolls naturally, with each chapter's 3D scene kept in step with
 * its content by the scroll timeline's mid-screen reading point
 * (lib/motion/scrollTimeline.ts) rather than by holding the content still —
 * and each chapter keeps its own `min-h` within the compact ranges this
 * feature specifies (mobile ~70-100vh, tablet ~90-120vh, desktop
 * ~100-140vh) rather than multiple stacked viewport heights.
 */
const chapters: { id: StageId; Section: () => React.JSX.Element }[] = [
  { id: "intro", Section: HeroSection },
  { id: "about", Section: AboutSection },
  { id: "typography", Section: ApproachSection },
  { id: "neural", Section: HowWeBuildSection },
  { id: "universe", Section: NumbersSection },
  { id: "game", Section: PlaygroundSection },
  { id: "future", Section: VisionSection },
  { id: "faq", Section: FaqSection },
];

function extractMinHeightVh(className: string): number[] {
  return Array.from(className.matchAll(/min-h-\[(\d+(?:\.\d+)?)vh\]/g)).map((match) =>
    Number(match[1])
  );
}

describe("chapter section responsiveness", () => {
  it.each(chapters)("keeps the '$id' chapter's own min-height within the compact 70-140vh budget", ({ id, Section }) => {
    render(<Section />);
    const el = document.querySelector(`[data-stage="${id}"]`);
    expect(el).not.toBeNull();

    const vhValues = extractMinHeightVh(el?.className ?? "");
    expect(vhValues.length).toBeGreaterThan(0);
    vhValues.forEach((vh) => {
      expect(vh).toBeGreaterThanOrEqual(70);
      expect(vh).toBeLessThanOrEqual(140);
    });
  });

  it.each(chapters)("never pins the '$id' chapter's content — it scrolls with the page at every breakpoint", ({ Section }) => {
    const { container } = render(<Section />);
    Array.from(container.querySelectorAll<HTMLElement>("*")).forEach((el) => {
      const classes = (el.getAttribute("class") ?? "").split(/\s+/);
      expect(classes.some((c) => c === "sticky" || c.endsWith(":sticky"))).toBe(false);
    });
  });
});
