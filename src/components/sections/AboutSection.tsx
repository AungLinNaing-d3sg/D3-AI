import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { brandPillars } from "@/data/pillars";

/** Chapter 1 — "Our Story": who D3-SG is, grounded in the existing "Who we
 * are" copy (see /docs/AboutUs.png). */
export function AboutSection() {
  return (
    <Section id="about" ariaLabelledBy="about-heading">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          headingId="about-heading"
          eyebrow="Our story"
          title="Who we are"
          description="D3-SG is a Singapore-based IT solutions provider that focuses on three solution areas — Data, Dynamics, and Digital — working alongside partners who offer complementary or value-added services to serve your organisation's varied IT transformation needs."
        />

        <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-10 sm:grid-cols-4">
          {brandPillars.map((pillar, index) => (
            <Reveal key={pillar.label} delay={index * 0.05} className="flex flex-col gap-1">
              <span className="font-display text-2xl font-semibold text-brand-400 sm:text-3xl">
                {pillar.value}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-200">
                {pillar.label}
              </span>
              <span className="text-sm leading-relaxed text-ink-400">{pillar.description}</span>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
