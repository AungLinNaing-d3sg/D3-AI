import { MotionDirector } from "@/components/site/MotionDirector";
import { SiteBackground } from "@/components/site/SiteBackground";
import { Hero } from "@/components/site/Hero";
import { Marquee } from "@/components/site/Marquee";
import { About } from "@/components/site/About";
import { Services } from "@/components/site/Services";
import { Process } from "@/components/site/Process";
import { Team } from "@/components/site/Team";
import { Faq } from "@/components/site/Faq";
import { Contact } from "@/components/site/Contact";

/**
 * Homepage — futuristic minimal. A title-only hero over the 3D pearl sphere;
 * everything after it rides up over the hero as one glass "curtain". Each
 * section has its own scroll transition and text-reveal style, all driven by
 * the invisible `<MotionDirector>` through `data-anim` attributes, so the
 * sections themselves stay plain, server-rendered, readable markup.
 */
export default function Home() {
  return (
    <>
      <SiteBackground />
      <MotionDirector />
      <Hero />
      <div className="stack">
        <div className="curtain">
          <Marquee />
          <About />
        </div>
        <Services />
        <Process />
        <Team />
        <Faq />
        <Contact />
      </div>
    </>
  );
}
