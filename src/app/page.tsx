import { SceneCanvas } from "@/components/three/SceneCanvas";
import { ScrollChoreographer } from "@/components/motion/ScrollChoreographer";
import { HeroSection } from "@/components/sections/HeroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { ServicesSection } from "@/components/sections/ServicesSection";
import { SolutionsSection } from "@/components/sections/SolutionsSection";
import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { TechnologySection } from "@/components/sections/TechnologySection";
import { TeamSection } from "@/components/sections/TeamSection";
import { CtaSection } from "@/components/sections/CtaSection";

/**
 * Homepage — an 8-chapter scroll-driven experience. `<SceneCanvas>` (the 3D
 * half) and `<ScrollChoreographer>` (the invisible GSAP/ScrollTrigger
 * controller) are siblings of the real HTML sections, not wrappers around
 * them, per the "separate 3D scenes from normal UI" requirement; they
 * communicate only through the shared `sceneState` singleton and the
 * `[data-scene-section]` DOM attribute.
 */
export default function Home() {
  return (
    <>
      <SceneCanvas />
      <ScrollChoreographer />
      <div id="experience-wrapper">
        <HeroSection />
        <AboutSection />
        <ServicesSection />
        <SolutionsSection />
        <ProjectsSection />
        <TechnologySection />
        <TeamSection />
        <CtaSection />
      </div>
    </>
  );
}
