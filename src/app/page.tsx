import { SceneCanvas } from "@/components/three/SceneCanvas";
import { ScrollChoreographer } from "@/components/motion/ScrollChoreographer";
import { IntroSection } from "@/components/sections/IntroSection";
import { TypographySection } from "@/components/sections/TypographySection";
import { NeuralSection } from "@/components/sections/NeuralSection";
import { UniverseSection } from "@/components/sections/UniverseSection";
import { ProductSection } from "@/components/sections/ProductSection";
import { GameSection } from "@/components/sections/GameSection";
import { FutureSection } from "@/components/sections/FutureSection";
import { CtaSection } from "@/components/sections/CtaSection";

/**
 * Homepage — one continuous, 8-chapter cinematic scrollytelling journey
 * through a single AI universe (cinematic intro → 3D typography → neural
 * network → data universe → AI product experience → "train your AI"
 * mini-game → cinematic AI future → final CTA).
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
        <TypographySection />
        <NeuralSection />
        <UniverseSection />
        <ProductSection />
        <GameSection />
        <FutureSection />
        <CtaSection />
      </div>
    </>
  );
}
