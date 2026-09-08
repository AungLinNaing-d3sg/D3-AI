import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { services } from "@/data/services";

/**
 * Chapter 06 — AI Product Experience. The floating 3D dashboards live in the
 * shared canvas (three/scenes/ProductScene.tsx, decorative/aria-hidden); the
 * real, accessible product content — the three actual service pillars from
 * src/data/services.ts — flows normally beneath the pinned intro so it's
 * always keyboard/screen-reader reachable, not just visually implied.
 */
export function ProductSection() {
  return (
    <Section stageId="product" ariaLabelledBy="product-heading" className="min-h-[260vh]">
      <div className="sticky top-0 flex h-[100svh] items-center py-24 sm:py-28">
        <Container>
          <SectionHeading
            headingId="product-heading"
            eyebrow="06 — Step inside the product"
            title="One platform, three disciplines"
            description="Data, Dynamics, and Digital capabilities come together as a single working environment — previewed behind this section as floating, interactive panels."
          />
        </Container>
      </div>

      <Container className="relative z-10 grid gap-6 pb-24 sm:grid-cols-3">
        {services.map((service, index) => (
          <Reveal key={service.slug} as="div" delay={index * 0.06}>
            <article className="flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-7">
              <ServiceIcon name={service.icon} className="h-8 w-8 text-brand-400" />
              <h3 className="font-display text-lg font-semibold text-ink-50">{service.title}</h3>
              <p className="text-sm leading-relaxed text-ink-300">{service.summary}</p>
              <ul className="mt-auto flex flex-col gap-2 border-t border-white/10 pt-4">
                {service.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-xs text-ink-400">
                    <span className="mt-1 h-1 w-1 flex-none rounded-full bg-brand-400" aria-hidden="true" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        ))}
      </Container>
    </Section>
  );
}
