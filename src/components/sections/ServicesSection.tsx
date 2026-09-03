import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { Reveal } from "@/components/motion/Reveal";
import { services } from "@/data/services";

/** Chapter 2 — Services: the three real service pillars, presented as a
 * large editorial list rather than generic feature cards. */
export function ServicesSection() {
  return (
    <Section id="services" ariaLabelledBy="services-heading">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          headingId="services-heading"
          eyebrow="What we do"
          title="Our services"
          description="Revolving around Microsoft technologies, our service portfolio spans three pillars — from raw data to intelligent applications."
        />

        <ol className="flex flex-col divide-y divide-white/10 border-y border-white/10">
          {services.map((service, index) => (
            <li key={service.slug}>
              <Reveal
                delay={index * 0.05}
                className="grid gap-6 py-10 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-10 lg:grid-cols-[3rem_2fr_3fr]"
              >
                <span
                  aria-hidden="true"
                  className="font-display text-sm font-semibold text-ink-500 sm:text-base"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="flex items-start gap-4">
                  <span className="mt-1 flex h-12 w-12 flex-none items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-brand-400">
                    <ServiceIcon name={service.icon} />
                  </span>
                  <div className="flex flex-col gap-2">
                    <h3 className="font-display text-xl font-semibold text-ink-50 sm:text-2xl">
                      {service.title}
                    </h3>
                    <p className="max-w-md text-sm leading-relaxed text-ink-300 sm:text-base">
                      {service.summary}
                    </p>
                  </div>
                </div>

                <ul className="grid gap-x-6 gap-y-2 sm:col-span-2 sm:grid-cols-2 lg:col-span-1">
                  {service.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-sm text-ink-400">
                      <span aria-hidden="true" className="mt-2 h-1 w-1 flex-none rounded-full bg-brand-400" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
