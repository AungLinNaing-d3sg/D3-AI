import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { capabilities } from "@/data/capabilities";

/** Chapter 3 — Solutions/Capabilities: how the three service pillars are
 * actually delivered, told as a connected three-step capability journey. */
export function SolutionsSection() {
  return (
    <Section id="solutions" ariaLabelledBy="solutions-heading">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          headingId="solutions-heading"
          eyebrow="How we deliver"
          title="Capabilities built for real transformation"
          description="Every engagement draws on the same three capability pillars — sequenced differently depending on where your organisation is starting from."
        />

        <div className="relative grid gap-6 lg:grid-cols-3">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent lg:block"
          />

          {capabilities.map((capability, index) => (
            <Reveal
              key={capability.slug}
              delay={index * 0.08}
              className="relative flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm transition-colors duration-300 hover:border-brand-400/40"
            >
              <span className="font-display text-3xl font-semibold text-brand-400/80">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display text-lg font-semibold text-ink-50">{capability.title}</h3>
              <p className="text-sm leading-relaxed text-ink-300">{capability.summary}</p>
              <ul className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-4">
                {capability.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-ink-400">
                    <span aria-hidden="true" className="mt-2 h-1 w-1 flex-none rounded-full bg-brand-400" />
                    {point}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
