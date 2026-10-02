import { MotionDirector } from "@/components/site/MotionDirector";
import { SiteBackground } from "@/components/site/SiteBackground";
import { Hero } from "@/components/site/Hero";
import { ProofStrip } from "@/components/site/ProofStrip";
import { About } from "@/components/site/About";
import { Services } from "@/components/site/Services";
import { Process } from "@/components/site/Process";
import { Team } from "@/components/site/Team";
import { Faq } from "@/components/site/Faq";
import { Contact } from "@/components/site/Contact";

/**
 * Homepage — light theme: hero with two product-style demo cards, a strip of
 * the sectors and certifications behind the team, then About, Services (each
 * discipline acted out by a small demo), How we deliver, Leadership, FAQ and
 * Contact. Section order mirrors the
 * existing site's Home → About Us → Our Services → Contact Us navigation.
 *
 * `<SiteBackground>` (static decorative backdrop) and `<MotionDirector>`
 * (invisible scroll reveals) are siblings of the sections rather than
 * wrappers, so every section stays plain, server-rendered, readable markup.
 */
export default function Home() {
  return (
    <>
      <SiteBackground />
      <MotionDirector />
      <Hero />
      <ProofStrip />
      <About />
      <Services />
      <Process />
      <Team />
      <Faq />
      <Contact />
    </>
  );
}
