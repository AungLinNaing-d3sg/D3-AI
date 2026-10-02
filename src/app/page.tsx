import { MotionDirector } from "@/components/site/MotionDirector";
import { SiteBackground } from "@/components/site/SiteBackground";
import { Hero } from "@/components/site/Hero";
import { TechMarquee } from "@/components/site/TechMarquee";
import { About } from "@/components/site/About";
import { Services } from "@/components/site/Services";
import { Process } from "@/components/site/Process";
import { Team } from "@/components/site/Team";
import { Faq } from "@/components/site/Faq";
import { Contact } from "@/components/site/Contact";

/**
 * Homepage — light theme: hero with live product-style demo cards, then
 * About, Services (each discipline acted out by a small animated demo), How
 * we deliver, Leadership, FAQ and Contact. Section order mirrors the
 * existing site's Home → About Us → Our Services → Contact Us navigation.
 *
 * `<SiteBackground>` (fixed decorative backdrop) and `<MotionDirector>`
 * (invisible scroll choreography) are siblings of the sections rather than
 * wrappers, so every section stays plain, server-rendered, readable markup.
 */
export default function Home() {
  return (
    <>
      <SiteBackground />
      <MotionDirector />
      <Hero />
      <TechMarquee />
      <About />
      <Services />
      <Process />
      <Team />
      <Faq />
      <Contact />
    </>
  );
}
