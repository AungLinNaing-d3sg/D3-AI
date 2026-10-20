import { SceneCanvas } from "@/components/three/SceneCanvas";
import { ScrollChoreographer } from "@/components/motion/ScrollChoreographer";
import { SiteAudioController } from "@/components/motion/SiteAudioController";
import { GlassPointer } from "@/components/motion/GlassPointer";
import { ScrollProgressRail } from "@/components/layout/ScrollProgressRail";
import { HeroSection } from "@/components/sections/HeroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { ApproachSection } from "@/components/sections/ApproachSection";
import { HowWeBuildSection } from "@/components/sections/HowWeBuildSection";
import { NumbersSection } from "@/components/sections/NumbersSection";
import { PlaygroundSection } from "@/components/sections/PlaygroundSection";
import { VisionSection } from "@/components/sections/VisionSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { ContactSection } from "@/components/sections/ContactSection";

/**
 * Homepage — one continuous, cinematic scrollytelling journey through a
 * single AI universe, in this order: Hero → About Us → Our Approach (the
 * three real disciplines) → How We Build → By the Numbers → AI Playground
 * → Vision → FAQ → Contact. Each section component is named after what it
 * shows; its internal stage id (`data-stage`, used by the 3D journey and
 * scroll timeline — see `STAGE_IDS` in src/types/index.ts) keeps its
 * original key, e.g. `<ApproachSection>` is stage `typography`.
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
      <SiteAudioController />
      <GlassPointer />
      <ScrollProgressRail />
      <div id="experience-wrapper">
        <HeroSection />
        <AboutSection />
        <ApproachSection />
        <HowWeBuildSection />
        <NumbersSection />
        <PlaygroundSection />
        <VisionSection />
        <FaqSection />
        <ContactSection />
      </div>
    </>
  );
}
