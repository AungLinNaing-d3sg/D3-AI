import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { faqItems } from "@/data/faq";
import { FaqAskLink, FaqItem } from "./FaqItem";

/**
 * Chapter 08 — FAQ (ported from the light redesign, development_v2). The
 * heading and a route to the team sit in the left column, with the shared
 * canvas's "Query Core" (three/scenes/FaqScene.tsx) floating in the open
 * space beneath them; the questions stack on the right as glass
 * disclosures. Single column on smaller screens, where the object moves up
 * behind the heading.
 */
export function FaqSection() {
  return (
    <Section stageId="faq" ariaLabelledBy="faq-heading" className="min-h-[75vh] md:min-h-[90vh] lg:min-h-[100vh]">
      <div className="relative flex h-auto flex-col justify-center py-16 md:min-h-[100svh] md:py-24">
        <Container className="faq-grid">
          <div className="faq-side">
            <SectionHeading
              headingId="faq-heading"
              eyebrow="08 — FAQ"
              title={
                <>
                  Questions, <span className="v2-accent">answered.</span>
                </>
              }
              description="Can’t find what you need? Send the team a message — we’ll get back to you."
              scrim
            />
            <Reveal delay={0.15} variant="blur" blur={4} y={8} duration={0.5} className="mt-8">
              <FaqAskLink />
            </Reveal>
          </div>
          <div className="faq-list">
            {faqItems.map((item, index) => (
              <Reveal as="div" variant="wipe" delay={index * 0.06} key={item.q}>
                <FaqItem q={item.q} a={item.a} index={index} />
              </Reveal>
            ))}
          </div>
        </Container>
      </div>
    </Section>
  );
}
