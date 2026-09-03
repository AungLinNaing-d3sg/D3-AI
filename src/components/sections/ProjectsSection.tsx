import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { focusAreas } from "@/data/focusAreas";

/**
 * Chapter 4 — Projects/Portfolio.
 *
 * No client case studies, logos, or project metrics are published in the
 * source material, so — per "do not invent important company information"
 * — this showcases the three real delivery focus areas (src/data/focusAreas.ts)
 * as a large, immersive editorial sequence instead of fabricated project
 * cards.
 */
export function ProjectsSection() {
  return (
    <Section id="projects" ariaLabelledBy="projects-heading">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          headingId="projects-heading"
          eyebrow="Where we deliver impact"
          title="Focus areas, not just features"
          description="A look at the kinds of engagements D3-SG delivers — grounded in the same real capabilities described above."
        />

        <div className="flex flex-col divide-y divide-white/10 border-y border-white/10">
          {focusAreas.map((area, index) => {
            return (
              <Reveal
                key={area.slug}
                delay={index * 0.06}
                className="relative grid gap-6 py-14 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="flex flex-col gap-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-400">
                    {String(index + 1).padStart(2, "0")} / {String(focusAreas.length).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-2xl font-semibold text-ink-50 sm:text-3xl">
                    {area.title}
                  </h3>
                  <p className="max-w-xl text-sm leading-relaxed text-ink-300 sm:text-base">
                    {area.description}
                  </p>
                </div>

                <ul className="flex flex-col gap-2 sm:min-w-[16rem]">
                  {area.outcomes.map((outcome) => (
                    <li
                      key={outcome}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-ink-300 sm:text-sm"
                    >
                      {outcome}
                    </li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
