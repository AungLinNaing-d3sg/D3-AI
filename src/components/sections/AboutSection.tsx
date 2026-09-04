import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { Reveal } from "@/components/motion/Reveal";
import { brandPillars } from "@/data/pillars";
import { services } from "@/data/services";

/** Short, human name for a service pillar, derived from its existing full
 * title (e.g. "Data — Analytics, Machine Learning & AI" → "Data") so this
 * section reuses the real service data instead of duplicating labels. */
function pillarName(title: string): string {
  return title.split(" — ")[0] ?? title;
}

/**
 * Chapter 1 — "Our Story": who D3-SG is, grounded in the existing "Who we
 * are" copy (see /docs/AboutUs.png), told as part of the scroll-driven
 * experience rather than a standard corporate text-and-image layout. The
 * three orbiting rings rendered behind this section (see
 * components/three/IdentityConstellation, driven by
 * `sceneState.identity.opacity`) visualise the same Data / Dynamics /
 * Digital identity echoed by the pillar list below, so the 3D scene and the
 * copy tell one continuous story instead of sitting side by side.
 */
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

        <ul
          className="grid grid-cols-1 gap-6 sm:grid-cols-3"
          aria-label="Our three solution pillars, visualised as orbiting rings in the scene"
        >
          {services.map((service, index) => (
            <li key={service.slug}>
              <Reveal
                delay={index * 0.08}
                className="flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition-colors duration-300 hover:border-brand-400/40 sm:p-8"
              >
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-brand-400">
                  <ServiceIcon name={service.icon} />
                </span>
                <h3 className="font-display text-lg font-semibold text-ink-50">
                  {pillarName(service.title)}
                </h3>
                <p className="text-sm leading-relaxed text-ink-300">{service.summary}</p>
              </Reveal>
            </li>
          ))}
        </ul>

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
