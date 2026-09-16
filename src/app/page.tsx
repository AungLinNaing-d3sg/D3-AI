import { SceneCanvas } from "@/components/three/SceneCanvas";
import { ScrollChoreographer } from "@/components/motion/ScrollChoreographer";
import { IntroSection } from "@/components/sections/IntroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { TypographySection } from "@/components/sections/TypographySection";
import { NeuralSection } from "@/components/sections/NeuralSection";
import { UniverseSection } from "@/components/sections/UniverseSection";
import { GameSection } from "@/components/sections/GameSection";
import { FutureSection } from "@/components/sections/FutureSection";
import { CtaSection } from "@/components/sections/CtaSection";

/**
 * Homepage — one continuous, 8-chapter cinematic scrollytelling journey
 * through a single AI universe (cinematic intro → about us → the three real
 * disciplines → neural network → data universe → "train your AI" mini-game
 * → cinematic AI future → final CTA). The "AI Product Experience" chapter
 * that used to sit between the data universe and the mini-game was removed
 * — it duplicated the same three real disciplines (Data/Dynamics/Digital)
 * the "Our Approach" chapter already covers; that chapter is now the single
 * source for them (see components/sections/TypographySection.tsx).
 *
 * `<SceneCanvas>` (the shared 3D half) and `<ScrollChoreographer>` (the
 * invisible GSAP/ScrollTrigger controller) are siblings of the real HTML
 * chapters, not wrappers around them, per the "separate 3D scenes from
 * normal UI" requirement; they communicate only through the shared
 * `journeyState` singleton (src/lib/motion/journeyState.ts) and the
 * `[data-stage]` DOM attribute each chapter's `<Section>` renders.
 */
export default function Home() {
  return (
    <>
      <SceneCanvas />
      <ScrollChoreographer />
      <div id="experience-wrapper">
        <IntroSection />
        <AboutSection />
        <TypographySection />
        <NeuralSection />
        <UniverseSection />
        <GameSection />
        <FutureSection />
        <CtaSection />
      </div>
    </>
  );
}
